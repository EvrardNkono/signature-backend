// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

const API_KEY = process.env.FIREBASE_API_KEY;
const PROJECT_ID = "restaurant-signature-16476";

let adminTokens = [];

async function sendNotification(token, title, body) {
  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token: token,
        notification: { title, body }
      }
    })
  });
  
  return response.json();
}

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
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  const result = await sendNotification(token, '🔔 Test', 'Notification fonctionnelle !');
  
  if (result.name) {
    console.log('✅ Test réussi');
    res.json({ success: true });
  } else {
    console.error('❌ Test échoué:', result.error?.message);
    res.status(400).json({ success: false, error: result.error?.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  console.log(`📦 Commande #${orderId} - ${customerName} - ${total}€`);
  console.log(`📨 Envoi à ${adminTokens.length} admin(s)`);
  
  if (adminTokens.length === 0) {
    return res.json({ success: false, message: 'Aucun admin enregistré' });
  }
  
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') messageBody = `🚚 Livraison: ${messageBody}`;
  else if (tableNumber) messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  
  let successCount = 0;
  for (const token of adminTokens) {
    const result = await sendNotification(token, '🆕 Nouvelle commande !', messageBody);
    if (result.name) successCount++;
  }
  
  console.log(`✅ Notification: ${successCount} succès`);
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