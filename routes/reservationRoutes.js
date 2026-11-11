// routes/reservationRoutes.js
// Branchement dans server.js :  app.use('/api/reservations', reservationRoutes);
//
// POST   /api/reservations               → le client envoie une demande (public)
// GET    /api/reservations               → liste pour l'admin (à venir + en attente)
// GET    /api/reservations/pending-count → nombre de demandes à confirmer (badge admin)
// PATCH  /api/reservations/:id/status    → confirmer / refuser / remettre en attente
// DELETE /api/reservations/:id           → supprimer

const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const router = express.Router();
const connectDB = require('../config/db');
const Reservation = require('../models/Reservation');

const ADMIN_URL = process.env.ADMIN_URL || 'https://restaurantsignature.fr/admin';

// Même initialisation que notificationRoutes.js (ignorée si déjà faite)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'restaurant-signature-16476',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

// Même collection de tokens admin que notificationRoutes.js
const AdminToken = mongoose.models.AdminToken || mongoose.model('AdminToken', new mongoose.Schema({
  token: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
}));

// ─── Helpers ────────────────────────────────────────────────
// Vercel tourne en UTC : on raisonne toujours en heure de Paris
const parisNow = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(x => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
};
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const fmtDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

async function notifyAdmins(resa) {
  const docs = await AdminToken.find();
  const tokens = docs.map(d => d.token);
  if (tokens.length === 0) return 0;

  const body = `${resa.name} · ${resa.guests} pers. · ${fmtDate(resa.date)} à ${resa.time}`;
  const results = await Promise.allSettled(tokens.map(token =>
    admin.messaging().send({
      token,
      notification: { title: '📅 Nouvelle réservation', body },
      data: { type: 'new_reservation', reservationId: String(resa._id), timestamp: Date.now().toString() },
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
      // Ouvre directement la page Réservations au clic (notification reçue en arrière-plan)
      webpush: { fcmOptions: { link: `${ADMIN_URL}/reservations` } }
    })
  ));

  // On ne supprime que les tokens réellement morts
  const dead = tokens.filter((_, i) => {
    const r = results[i];
    return r.status === 'rejected' &&
      ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.reason?.code);
  });
  if (dead.length) await AdminToken.deleteMany({ token: { $in: dead } });

  return results.filter(r => r.status === 'fulfilled').length;
}

// ─── Public : nouvelle demande ──────────────────────────────
router.post('/', async (req, res) => {
  try {
    await connectDB();
    const { date, time, guests, name, phone, email, notes, consent, website } = req.body || {};

    if (website) return res.json({ success: true }); // champ piège anti-spam : on ne révèle rien

    if (!consent) return res.status(400).json({ message: 'Consentement requis.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || ''))
      return res.status(400).json({ message: 'Date ou heure invalide.' });

    const g = Number(guests);
    if (!Number.isInteger(g) || g < 1 || g > 10)
      return res.status(400).json({ message: 'Nombre de couverts invalide (1 à 10 en ligne).' });

    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    if (cleanName.length < 2) return res.status(400).json({ message: 'Nom requis.' });
    if (cleanPhone.replace(/\D/g, '').length < 8) return res.status(400).json({ message: 'Numéro de téléphone invalide.' });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'E-mail invalide.' });

    // Créneaux : toutes les 30 min, de 12:00 à 22:00
    const m = toMin(time);
    if (m % 30 !== 0 || m < 12 * 60 || m > 22 * 60)
      return res.status(400).json({ message: 'Créneau indisponible.' });

    const now = parisNow();
    const limit = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    if (date < now.date || (date === now.date && m < now.minutes + 60))
      return res.status(400).json({ message: 'Ce créneau est déjà passé ou trop proche. Appelez-nous.' });
    if (date > limit) return res.status(400).json({ message: 'Réservation possible jusqu’à 3 mois à l’avance.' });

    // Anti double-clic : même numéro, même créneau, dans les 10 dernières minutes
    const dup = await Reservation.findOne({
      phone: cleanPhone, date, time, createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    if (dup) return res.status(200).json({ success: true });

    const resa = await Reservation.create({
      date, time, guests: g, name: cleanName, phone: cleanPhone,
      email: email || '', notes: String(notes || '').slice(0, 500)
    });

    // On attend la notification avant de répondre (sur Vercel, le travail en
    // arrière-plan est coupé dès que la réponse part), sans jamais faire échouer la demande.
    try {
      const sent = await notifyAdmins(resa);
      console.log(`📅 Réservation ${resa._id} — notifications admin: ${sent}`);
    } catch (e) {
      console.error('⚠️ Notification réservation:', e.message);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ Réservation:', err);
    res.status(500).json({ message: 'Erreur serveur. Merci de nous appeler.' });
  }
});

// ─── Admin ──────────────────────────────────────────────────
router.get('/pending-count', async (req, res) => {
  await connectDB();
  const count = await Reservation.countDocuments({ status: 'pending', date: { $gte: parisNow().date } });
  res.json({ success: true, count });
});

router.get('/', async (req, res) => {
  await connectDB();
  const today = parisNow().date;
  const filter = req.query.all === '1'
    ? {}
    : { $or: [{ date: { $gte: today } }, { status: 'pending' }] };
  const data = await Reservation.find(filter).sort({ date: 1, time: 1 }).limit(500).lean();
  res.json({ success: true, data });
});

router.patch('/:id/status', async (req, res) => {
  await connectDB();
  const { status } = req.body || {};
  if (!['pending', 'confirmed', 'declined'].includes(status))
    return res.status(400).json({ success: false, message: 'Statut invalide.' });

  const resa = await Reservation.findByIdAndUpdate(
    req.params.id,
    { status, handledAt: status === 'pending' ? null : new Date() },
    { new: true }
  );
  if (!resa) return res.status(404).json({ success: false, message: 'Réservation introuvable.' });
  res.json({ success: true, data: resa });
});

router.delete('/:id', async (req, res) => {
  await connectDB();
  await Reservation.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
