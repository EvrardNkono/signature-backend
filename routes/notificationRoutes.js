const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const mongoose = require('mongoose');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "restaurant-signature-16476",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

// Schéma simple pour stocker les tokens
const AdminToken = mongoose.models.AdminToken || mongoose.model('AdminToken', new mongoose.Schema({
  token: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
}));

router.post('/register-admin', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token requis' });
  await AdminToken.findOneAndUpdate({ token }, { token }, { upsert: true });
  console.log(`✅ Token enregistré en DB`);
  res.json({ success: true });
});

router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token manquant' });
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title: '🔔 Test', body: 'Notification fonctionnelle !' }
    });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;

  const adminTokenDocs = await AdminToken.find();
  const tokens = adminTokenDocs.map(d => d.token);

  if (tokens.length === 0) return res.json({ success: false, message: 'Aucun admin' });

  let body = `${customerName} - ${total}€`;
  if (mode === 'Livraison') body = `🚚 Livraison: ${body}`;
  else if (tableNumber) body = `🍽️ Table ${tableNumber}: ${body}`;

  const results = await Promise.allSettled(
    tokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title: '🆕 Nouvelle commande !', body },
        data: { orderId: String(orderId), type: 'new_order' }
      })
    )
  );

  // Supprimer les tokens expirés
  const expiredTokens = tokens.filter((_, i) => results[i].status === 'rejected');
  if (expiredTokens.length > 0) {
    await AdminToken.deleteMany({ token: { $in: expiredTokens } });
  }

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Notifications: ${successCount}/${results.length}`);
  res.json({ success: true, successCount });
});

router.get('/stats', async (req, res) => {
  const count = await AdminToken.countDocuments();
  res.json({ success: true, totalAdmins: count });
});

router.post('/reset-tokens', async (req, res) => {
  await AdminToken.deleteMany({});
  res.json({ success: true });
});

module.exports = router;