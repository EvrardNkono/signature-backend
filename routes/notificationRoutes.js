// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

const API_KEY = process.env.FIREBASE_API_KEY;
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
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: 'Test',
            body: 'Notification fonctionnelle !'
          }
        }
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test réussi');
      res.json({ success: true, data });
    } else {
      console.error('❌ Test échoué:', data);
      res.status(400).json({ success: false, error: data.error?.message });
    }
  } catch (error) {
    console.error('💥 Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  console.log(`📦 Commande #${orderId} - ${customerName} - ${total}€`);
  console.log(`📨 Envoi à ${adminTokens.length} admin(s)`);
  
  if (adminTokens.length === 0) {
    return res.json({ success: false, message: 'Aucun admin' });
  }
  
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') messageBody = `🚚 Livraison: ${messageBody}`;
  else if (tableNumber) messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  
  let successCount = 0;
  let errors = [];
  
  for (const token of adminTokens) {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: '🆕 Nouvelle commande !',
              body: messageBody
            },
            data: {
              orderId: orderId,
              type: 'new_order'
            }
          }
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        successCount++;
      } else {
        errors.push(data.error?.message);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  console.log(`✅ Notification: ${successCount} succès`);
  res.json({ success: true, successCount, errors });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;