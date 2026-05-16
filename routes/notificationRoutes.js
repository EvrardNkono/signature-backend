const express = require('express');
const router = express.Router();

const crypto = require('crypto');

const PROJECT_ID = "restaurant-signature-16476";

async function getAccessToken() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Variable d'environnement FIREBASE_SERVICE_ACCOUNT manquante !");
  }

  let credentialsStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

  // Nettoyage guillemets
  if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"'))
    credentialsStr = credentialsStr.slice(1, -1);
  if (credentialsStr.startsWith("'") && credentialsStr.endsWith("'"))
    credentialsStr = credentialsStr.slice(1, -1);

  let credentials;
  try {
    credentials = JSON.parse(credentialsStr);
  } catch {
    try {
      credentials = JSON.parse(Buffer.from(credentialsStr, 'base64').toString('utf8'));
    } catch {
      throw new Error("Impossible de parser FIREBASE_SERVICE_ACCOUNT");
    }
  }

  // === DEBUG TEMPORAIRE - À SUPPRIMER APRÈS ===
  console.log('=== DEBUG CLÉ ===');
  console.log('Début clé:', JSON.stringify(credentials.private_key.substring(0, 60)));
  console.log('Fin clé:', JSON.stringify(credentials.private_key.substring(credentials.private_key.length - 60)));
  console.log('Contient \\n littéral:', credentials.private_key.includes('\\n'));
  console.log('Contient vrai newline:', credentials.private_key.includes('\n'));
  console.log('=================');
  // ============================================

  // Nettoyage AGRESSIF de la clé privée
  let privateKey = credentials.private_key;

  // Étape 1 : remplacer tous les \n littéraux (y compris \\n, \\\\n, etc.)
  privateKey = privateKey.replace(/\\+n/g, '\n');

  // Étape 2 : si la clé est sur une seule ligne (sans vrais sauts), la reformater
  if (!privateKey.includes('\n')) {
    privateKey = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace(/(.{64})/g, '$1\n');
  }

  // Étape 3 : construire manuellement le JWT et appeler token_uri directement
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  // Échange du JWT contre un access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error('❌ Réponse Google:', JSON.stringify(tokenData));
    throw new Error(`Échec token Google: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
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