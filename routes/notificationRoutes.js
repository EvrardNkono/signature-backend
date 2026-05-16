const express = require('express');
const router = express.Router();
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = "restaurant-signature-16476";

// ========== CREDENTIALS FIREBASE ==========
const FIREBASE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "restaurant-signature-16476",
  "private_key_id": "659a51a74c4233f3dd4f341e9e91c57299db0251",
  "private_key": `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzyZVhSl0ZgJpn
5tyjiQJaQE2k1d5bfeihq+DdBXRD23DALJk0yS95Qj+H6XbL/XaRHdnZc6thTGBy
9tfsXpOKWrhyCsLmGhUNDzbU+AuA5tuRIl+YcdNg7EXrmlVo6/PuqF/mNUyHix4C
TE0/h77qkLHrc4SikH4iHRP+ILrjSecf21qIRDo4d/7rZDo+JR488Ov9BetXFweL
eG053SeHdHuA0yq+kqCZk9Iu+P/86+I4x9GxMq71NrcegkZ2qYms+Nwbu0Uc5uBT
+dZbVovitZcOOoDx0hCh8wZ53ov7fZ4kSW6I0ja7O0vNzv4v+lIQXpX/muh3bgoP
ORQadsP7AgMBAAECggEAOjxvVzrbylF2cnZ8/Ln6GZrfq6edJZy0uH2w0lcccIiJ
zq4DmG4coxYa9x7gHLaG6/2z3bSSjGtNiJ+9lHKULwow2bvzos5LCFZnx/dq3n+p
Gqt8NKiWNDyEb4sn5Fsdwi4nFi4oknU1LMBje1Mwu9FP2HksOu479TffDH+0mb+A
QBohK6FaopNnpetvrhaDqvsYb2Ia5uORKnX8FQlaLV5BvWN88PFL/wZUT6j6V6T1
vEcBL6aLYiL+kXX6Q7orP2rb9z5hf9Hc1w/2eyPqAugnxRB4r2h+Xi95A5OAYhVl
zyi/Dmmh/cvkhbnJ0xE1rZB/MiPY/2t6wiTSj/pi3QKBgQDvKwNBjq72Xx+ujb6w
2ZLoHN5wMrhCvpKaGppTL8meBcQKUeCfSAGjcuU9TLciVezoZiVUMzyF3c+qns2o
LlRRye241LIj0MfSBYoUa9wuW2ckJK6Z7SWdlVvefqKnpHGnaa18ttKTpuKW0y+9
ApiKDfgQ+oF9ZQwMxasVePy9PwKBgQDAcLyDxk6KUXFSd1sfsv17QtX7txMKhed5
vz0ohz8GujAKM5sIZFLolhA6NdrIgs78zG7xfoUAhZn9nkZ0SKEPLghgrQv6qcBG
MijzeszFPYaf83NEs7rPBFgGByeDJbuoDDB7YNzDR09yl2H4BYHyR6FtC2GzJZNK
okklVl2+RQKBgFkS0+uekFsBonMIJ3UGE0iPN+jheu6gu0jZj5Bbw+MukoylYdrw
nmuZZvclky8egVUsdcqeKnRQ3/7TlhSE7LJpWjf0P0RHhaQanApvAVnigM9dOgnp
4JCIB+cdksaM4CdRnGNOU67aAJnbnXPve5AvE6x/H6rr70jydX1Ryg9RAoGANhZ5
pb/zC0VgyIDrh7lTLXXXluwZ2fdQ3BM4KU/6EvX50qQ2iuFHvD+RSAsi9wBtFPiQ
piedUkw6v+Hgg4Z2XkHd8O4yU72qYRBwGh8FttpYIFTYrRKnCtB5vRf9rwrH96+V
YNgUtH4ygk6yJnfF0kb3xCJSz3tcLrn2PRxNNNECgYAgIKkmIhAdBs8vCGbp5i6h
7MPaadCO+FYHtBFnYsEk5VYu7cckb9qYjaWWDNU6bHbRdsS+BbEc3i2pkh4Mw6ob
/36ozFifSE7b5wUCbEnKVbzDnF9nj7hU6wQ1i6fqbImsg2J3nuekYOn58A8t5GAN
Z0+oTZtR74GI9wLoIn7Q+g==
-----END PRIVATE KEY-----`,
  "client_email": "firebase-adminsdk-fbsvc@restaurant-signature-16476.iam.gserviceaccount.com",
  "client_id": "109227702051559712469",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40restaurant-signature-16476.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};
// ================================================

// Version simplifiée avec google-auth-library
async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: FIREBASE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  });
  
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
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
    const accessToken = await getAccessToken();
    
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
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
    const accessToken = await getAccessToken();

    const notificationPromises = adminTokens.map(async (token) => {
      try {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
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
    console.error('💥 Erreur Auth:', authError);
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