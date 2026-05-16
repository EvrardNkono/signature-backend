// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = "restaurant-signature-16476";

// Fonction pour générer un jeton d'accès OAuth2 valide à la volée
async function getAccessToken() {
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error("Variables d'environnement Firebase manquantes !");
  }

  let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();

  // 1. On vire d'abord les guillemets parasites ajoutés par Vercel
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1);
  
  privateKey = privateKey.trim();

  // 2. Maintenant on check sereinement si c'est du Base64 ou du texte brut
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    // C'est du Base64 pur
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  } else {
    // C'est du texte brut, on remplace les sauts de ligne textuels
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Configuration de l'authentification Google OAuth2
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
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
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  try {
    const oauth2Token = await getAccessToken();
    
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oauth2Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: '🔔 Test',
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
  
  try {
    const oauth2Token = await getAccessToken();

    for (const token of adminTokens) {
      try {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauth2Token}`,
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
                orderId: String(orderId),
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

  } catch (authError) {
    console.error('💥 Erreur Auth OAuth2:', authError);
    res.status(500).json({ success: false, error: "Échec de génération du token Google" });
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