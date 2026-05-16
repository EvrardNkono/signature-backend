const express = require('express');
const router = express.Router();

const crypto = require('crypto');

const PROJECT_ID = "restaurant-signature-16476";

// ========== CREDENTIALS FIREBASE EN DUR ==========
const FIREBASE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "restaurant-signature-16476",
  "private_key_id": "226712130c7b87b26ef07629f8bff183e63fc92f",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCz3uLdJis28L/K\nlzPrj5K+iU2wqSM6QSgUzf4i7twtRPYaTVqqxIH7MLFHg7vx0B1WdS3Vsa7J8y+d\nBpOzoqZpoDnnJEwmDbhdPFpOpXt7WCOhSMoUhX699Hj2LqOTpK/y6LpTJ1NzIUPh\nydADQ2ymdyWhhqfQcqpas1IRXVTiYufdLs0lFQlXsGe4iMuJLovrJsz3ZqITMwSv\nIHpVefzjga36Qfp2nm4L7Y4ddZL80lAdMc6hBPINz6xI2pm+cKiGJ0e20kbEEkVm\naTqZFWsfTP/jFIEmZMmWNYLrHW3r9WogE69hKwppaT0FG91xyzN6BfDNN2whrDXO\nPIliSP59AgMBAAECggEACQeDa1pn3FpJwafe4KoOHq5LoTaRNAxV49sS/fojdGRP\nV5lFfjTe8r1wtzUH1McMcGAk6ZYBvu9Y/XCslN2krY29CmGzyH9ABfIqW5aKdD7D\nvx9yNLiE2PblfmcJKbeGztKPALvRjRu0Fo9Bqw0R7oNYEMIIbGB6Aiz/tCtAWelL\nTeGrn2RvlYqL4/wtp0YxSQ0Te0xTjjeVg4BKVB2T/iUri+Fx3ihLQU7WJtpQM6Xy\niG/1sosBaSDXhqaDe1zmk2LUZVOj4g3V2QZQfeeNnq///8htuMS2ChtCiq1exkjD\nqoIhZFwz3U44ry5rq2Ruv6lwRxcpDxOpzx5B2tM8kwKBgQDrpr6ecL6XnrMTokcd\nateoLMUL2t9JZJdhwpvhcI0PAKxF0o9HFrZMIyX53NDBu/1oUc9lO9R0e9k3RMyp\nbDFTm8w/RY8HgYfHPkBPK4hb7MbiC9/RSwJKqxPjIfwxfUy6CuHX9thD2SiYKNaL\n+EZ2++VmgOoSnxRZ7d4L+qxUEwKBgQDDZxDsHTvrVvsFz7x5rPYBtNhJJdGtiOVw\nxiPLXyW1m/auROz2xuGCb/NoM/CEr/YwG65g88aA988sIsuvexPkmZGa9DCIN/zt\nAYM6rBIseb7UEQzuc2JG/AZYvRlPggwRXi04I4VYUOu99Ihj0H2u5ChffYg0SfFk\nhuK+l0AVLwKBgD8M802zPtuUg7eKINr3HlKKAALnAf1CI9rtVgXgtm1AMdfQubM8\nmXQPp3aOJXDgmrHRydr9QiAUjw7hopzmLOCA/Aol01ofxzOBLXXBYQ+vb5tFsBHw\nruFJmt2X10FqlB/nD3xYOI8WyGzF6Hm06S2mwj9F2Ns4oxpYsaOk43zvAoGAWYMv\nZ1qFBmwUFjdxubOYBnQX2HpwsTRTFvRNlW6C0c0elfqRKwM0bxJlyMhyV/ZbqvIj\nUdqahp3+09Mkx8Bz/nazEu7mBKDRRqk4unn04VbsKi2dZOaKkMYHCkOmApwqdxJT\nWLI89ZYsSBprGH579NAkBop1CK8O2+RGntSe0JUCgYBV+DpJSd1iFzsSy8XuCExn\njiVTNHip20MypunlSKM83kMy7FQ3nnVy+7bJUbXjbhxi18f2WxlfA6bfxaOtTXhh\nR3gr9WtxxNZiePdYqUyoUxpblSSeIX5ZLeeJ5gMx0onBke24OJFmPVeO3R01LtTu\nmOLCO7UYO52nA2X6KqXWUg==\n-----END PRIVATE KEY-----\n",
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