// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleAuth } = require('google-auth-library');

// Initialiser Google Auth avec les variables d'environnement
const auth = new GoogleAuth({
  credentials: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/firebase.messaging']
});

let adminTokens = [];

// Obtenir un token d'accès OAuth2
async function getAccessToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// Enregistrer un token admin
router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  if (!adminTokens.includes(token)) {
    adminTokens.push(token);
    console.log(`✅ Token enregistré (${adminTokens.length})`);
  }
  res.json({ success: true });
});

// Tester un token
router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  try {
    const accessToken = await getAccessToken();
    console.log('🔑 Token OAuth2 obtenu');
    
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: '🔔 Test',
            body: 'Si vous voyez ceci, les notifications fonctionnent !'
          }
        }
      })
    });
    
    const data = await response.json();
    console.log('📬 Réponse FCM:', data);
    
    if (response.ok) {
      res.json({ success: true, data });
    } else {
      res.status(400).json({ success: false, error: data.error?.message });
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Nouvelle commande
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
  
  try {
    const accessToken = await getAccessToken();
    const results = [];
    
    for (const token of adminTokens) {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
              type: 'new_order',
              click_action: '/admin/orders'
            }
          }
        })
      });
      const data = await response.json();
      results.push(data);
      console.log(`📬 Envoi à ${token.substring(0, 20)}...: ${response.ok ? '✅' : '❌'}`);
    }
    
    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistiques
router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

// Réinitialiser les tokens
router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;