const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Initialisation une seule fois
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "restaurant-signature-16476",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

let adminTokens = [];

router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token requis' });
  if (!adminTokens.includes(token)) {
    adminTokens.push(token);
    console.log(`✅ Token enregistré (${adminTokens.length})`);
  }
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
    console.log('✅ Test réussi:', result);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Test échoué:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;

  if (adminTokens.length === 0) return res.json({ success: false, message: 'Aucun admin' });

  let body = `${customerName} - ${total}€`;
  if (mode === 'Livraison') body = `🚚 Livraison: ${body}`;
  else if (tableNumber) body = `🍽️ Table ${tableNumber}: ${body}`;

  const results = await Promise.allSettled(
    adminTokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title: '🆕 Nouvelle commande !', body },
        data: { orderId: String(orderId), type: 'new_order' }
      })
    )
  );

  // Nettoyer les tokens expirés
  adminTokens = adminTokens.filter((_, i) => results[i].status === 'fulfilled');

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Notifications: ${successCount}/${results.length}`);
  res.json({ success: true, successCount });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;