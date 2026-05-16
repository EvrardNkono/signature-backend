const express = require('express');
const router = express.Router();
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = "restaurant-signature-16476";

// Fonction robuste pour générer un jeton d'accès OAuth2 valide à la volée
async function getAccessToken() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Variable d'environnement FIREBASE_SERVICE_ACCOUNT manquante !");
  }

  let credentialsStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

  // 1. Nettoyage radical de tous les types de guillemets parasites de Vercel
  if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) credentialsStr = credentialsStr.slice(1, -1);
  if (credentialsStr.startsWith("'") && credentialsStr.endsWith("'")) credentialsStr = credentialsStr.slice(1, -1);
  credentialsStr = credentialsStr.trim();

  let credentials;
  
  // 2. Stratégie de parsing adaptative (JSON brut vs Base64)
  try {
    // On tente d'abord de lire directement si c'est du JSON brut
    credentials = JSON.parse(credentialsStr);
  } catch (jsonError) {
    try {
      // Si le JSON direct échoue, c'est obligatoirement le Base64. On décode et on parse.
      const decodedSign = Buffer.from(credentialsStr, 'base64').toString('utf8');
      credentials = JSON.parse(decodedSign);
    } catch (base64Error) {
      throw new Error("Échec critique : Le contenu n'est ni du JSON valide, ni du Base64 correct.");
    }
  }

  // GoogleAuth gère parfaitement l'objet d'identification
  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key, 
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

    // Envoi en parallèle via Promise.allSettled pour éviter les goulots d'étranglement
    const notificationPromises = adminTokens.map(async (token) => {
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
          return { success: true };
        } else {
          return { success: false, error: data.error?.message };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        errors.push(result.value?.error || "Erreur réseau");
      }
    });
    
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