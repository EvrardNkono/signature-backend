// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;

let adminTokens = [];

router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  if (!adminTokens.includes(token)) {
    adminTokens.push(token);
    console.log(`✅ Token enregistré (${adminTokens.length})`);
  }
  res.json({ success: true });
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  if (adminTokens.length === 0 || !FIREBASE_SERVER_KEY) {
    return res.json({ success: false, message: 'Configuration manquante' });
  }
  
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') messageBody = `🚚 Livraison: ${messageBody}`;
  else if (tableNumber) messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  
  // Version avec l'API v1 (recommandée)
  const results = [];
  for (const token of adminTokens) {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/restaurant-signature-16476/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: '🆕 Nouvelle commande !',
              body: messageBody
            },
            data: { orderId, type: 'new_order' }
          }
        })
      });
      const data = await response.json();
      results.push(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }
  
  res.json({ success: true, count: results.length });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/restaurant-signature-16476/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: { title: 'Test', body: 'Fonctionne !' }
        }
      })
    });
    const data = await response.json();
    res.json({ success: response.ok, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;