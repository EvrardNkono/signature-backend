// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

// ⚠️ Utilise la même clé que dans ton .env
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const PROJECT_ID = "restaurant-signature-16476";

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
  
  console.log('🔑 Clé API utilisée:', FIREBASE_API_KEY ? '✅ Présente' : '❌ Manquante');
  console.log('📱 Token:', token ? token.substring(0, 30) + '...' : '❌');
  
  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREBASE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: 'Test',
            body: 'Ca marche !'
          }
        }
      })
    });
    
    const data = await response.json();
    console.log('📬 Réponse FCM:', data);
    
    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: data.error?.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  if (adminTokens.length === 0) return res.json({ success: false });
  
  let body = `${customerName} - ${total}€`;
  if (mode === 'Livraison') body = `🚚 Livraison: ${body}`;
  else if (tableNumber) body = `🍽️ Table ${tableNumber}: ${body}`;
  
  for (const token of adminTokens) {
    await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREBASE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: { title: '🆕 Nouvelle commande !', body: body }
        }
      })
    });
  }
  
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;