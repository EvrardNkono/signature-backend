// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Charger le fichier JSON directement
const serviceAccount = require('../firebase-adminsdk.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialisé');
}

let adminTokens = [];

router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  if (!adminTokens.includes(token)) {
    adminTokens.push(token);
    console.log(`✅ Token enregistré (${adminTokens.length})`);
  }
  res.json({ success: true });
});

router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  
  try {
    const response = await admin.messaging().send({
      notification: { title: 'Test', body: 'Fonctionne !' },
      token: token
    });
    res.json({ success: true, response });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  if (adminTokens.length === 0) return res.json({ success: false });
  
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') messageBody = `🚚 Livraison: ${messageBody}`;
  else if (tableNumber) messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  
  try {
    const response = await admin.messaging().sendEachForMulticast({
      notification: { title: '🆕 Nouvelle commande !', body: messageBody },
      data: { orderId, type: 'new_order' },
      tokens: adminTokens
    });
    res.json({ success: true, successCount: response.successCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;