const express = require('express');
const router = express.Router();

const crypto = require('crypto');

const PROJECT_ID = "restaurant-signature-16476";

// ========== CREDENTIALS FIREBASE EN DUR ==========
const FIREBASE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "restaurant-signature-16476",
  "private_key_id": "659a51a74c4233f3dd4f341e9e91c57299db0251",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzyZVhSl0ZgJpn\n5tyjiQJaQE2k1d5bfeihq+DdBXRD23DALJk0yS95Qj+H6XbL/XaRHdnZc6thTGBy\n9tfsXpOKWrhyCsLmGhUNDzbU+AuA5tuRIl+YcdNg7EXrmlVo6/PuqF/mNUyHix4C\nTE0/h77qkLHrc4SikH4iHRP+ILrjSecf21qIRDo4d/7rZDo+JR488Ov9BetXFweL\neG053SeHdHuA0yq+kqCZk9Iu+P/86+I4x9GxMq71NrcegkZ2qYms+Nwbu0Uc5uBT\n+dZbVovitZcOOoDx0hCh8wZ53ov7fZ4kSW6I0ja7O0vNzv4v+lIQXpX/muh3bgoP\nORQadsP7AgMBAAECggEAOjxvVzrbylF2cnZ8/Ln6GZrfq6edJZy0uH2w0lcccIiJ\nzq4DmG4coxYa9x7gHLaG6/2z3bSSjGtNiJ+9lHKULwow2bvzos5LCFZnx/dq3n+p\nGqt8NKiWNDyEb4sn5Fsdwi4nFi4oknU1LMBje1Mwu9FP2HksOu479TffDH+0mb+A\nQBohK6FaopNnpetvrhaDqvsYb2Ia5uORKnX8FQlaLV5BvWN88PFL/wZUT6j6V6T1\nvEcBL6aLYiL+kXX6Q7orP2rb9z5hf9Hc1w/2eyPqAugnxRB4r2h+Xi95A5OAYhVl\nzyi/Dmmh/cvkhbnJ0xE1rZB/MiPY/2t6wiTSj/pi3QKBgQDvKwNBjq72Xx+ujb6w\n2ZLoHN5wMrhCvpKaGppTL8meBcQKUeCfSAGjcuU9TLciVezoZiVUMzyF3c+qns2o\nLlRRye241LIj0MfSBYoUa9wuW2ckJK6Z7SWdlVvefqKnpHGnaa18ttKTpuKW0y+9\nApiKDfgQ+oF9ZQwMxasVePy9PwKBgQDAcLyDxk6KUXFSd1sfsv17QtX7txMKhed5\nvz0ohz8GujAKM5sIZFLolhA6NdrIgs78zG7xfoUAhZn9nkZ0SKEPLghgrQv6qcBG\nMijzeszFPYaf83NEs7rPBFgGByeDJbuoDDB7YNzDR09yl2H4BYHyR6FtC2GzJZNK\nokklVl2+RQKBgFkS0+uekFsBonMIJ3UGE0iPN+jheu6gu0jZj5Bbw+MukoylYdrw\nnmuZZvclky8egVUsdcqeKnRQ3/7TlhSE7LJpWjf0P0RHhaQanApvAVnigM9dOgnp\n4JCIB+cdksaM4CdRnGNOU67aAJnbnXPve5AvE6x/H6rr70jydX1Ryg9RAoGANhZ5\npb/zC0VgyIDrh7lTLXXXluwZ2fdQ3BM4KU/6EvX50qQ2iuFHvD+RSAsi9wBtFPiQ\npiedUkw6v+Hgg4Z2XkHd8O4yU72qYRBwGh8FttpYIFTYrRKnCtB5vRf9rwrH96+V\nYNgUtH4ygk6yJnfF0kb3xCJSz3tcLrn2PRxNNNECgYAgIKkmIhAdBs8vCGbp5i6h\n7MPaadCO+FYHtBFnYsEk5VYu7cckb9qYjaWWDNU6bHbRdsS+BbEc3i2pkh4Mw6ob\n/36ozFifSE7b5wUCbEnKVbzDnF9nj7hU6wQ1i6fqbImsg2J3nuekYOn58A8t5GAN\nZ0+oTZtR74GI9wLoIn7Q+g==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@restaurant-signature-16476.iam.gserviceaccount.com",
  "client_id": "109227702051559712469",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40restaurant-signature-16476.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};
// ================================================

// ========== ROUTE DE DIAGNOSTIC - À SUPPRIMER APRÈS RÉSOLUTION ==========
router.get('/debug-env', (req, res) => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || 'MANQUANTE';
  const first50 = raw.substring(0, 50);
  const last50 = raw.substring(raw.length - 50);
  const length = raw.length;
  
  // Tente JSON
  let jsonOk = false;
  let base64Ok = false;
  
  try { JSON.parse(raw); jsonOk = true; } catch(e) {}
  try { JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); base64Ok = true; } catch(e) {}
  
  res.json({ 
    exists: raw !== 'MANQUANTE',
    length, 
    first50, 
    last50, 
    jsonOk, 
    base64Ok,
    startsWithQuote: raw.startsWith('"'),
    endsWithQuote: raw.endsWith('"'),
    hasNewlines: raw.includes('\n'),
    hasBackslashN: raw.includes('\\n')
  });
});
// =========================================================================

async function getAccessToken() {
  // Utilisation directe des credentials en dur
  const credentials = FIREBASE_CREDENTIALS;

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