// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Fonction d'initialisation dynamique indispensable pour l'environnement Serverless (Vercel)
function getFirebaseAdminMessaging() {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Variables d'environnement Firebase manquantes dans le .env !");
    }

    // Nettoyage de la clé privée (gestion des guillemets doubles ajoutés par Vercel)
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    
    // Remplacement des anti-slash n textuels par des vrais sauts de ligne
    privateKey = privateKey.replace(/\\n/g, '\n');

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log("🚀 Firebase Admin initialisé dynamiquement avec succès !");
    } catch (error) {
      console.error("❌ Échec de l'initialisation dynamique de Firebase Admin:", error);
      throw error;
    }
  }
  return admin.messaging();
}

let adminTokens = [];

// Fonction d'envoi utilisant l'instance dynamique
async function sendNotification(token, title, body) {
  const message = {
    token: token,
    notification: {
      title: title,
      body: body
    }
  };

  try {
    const messaging = getFirebaseAdminMessaging();
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("❌ Erreur FCM d'envoi:", error);
    return { success: false, error: error.message };
  }
}

// --- Les Routes ---

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
  
  const result = await sendNotification(token, '🔔 Test', 'Notification fonctionnelle !');
  
  if (result.success) {
    console.log('✅ Test réussi');
    res.json({ success: true });
  } else {
    console.error('❌ Test échoué:', result.error);
    res.status(400).json({ success: false, error: result.error });
  }
});

router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber } = req.body;
  
  console.log(`📦 Commande #${orderId} - ${customerName} - ${total}€`);
  console.log(`📨 Envoi à ${adminTokens.length} admin(s)`);
  
  if (adminTokens.length === 0) {
    return res.json({ success: false, message: 'Aucun admin enregistré' });
  }
  
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') messageBody = `🚚 Livraison: ${messageBody}`;
  else if (tableNumber) messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  
  let successCount = 0;
  for (const token of adminTokens) {
    const result = await sendNotification(token, '🆕 Nouvelle commande !', messageBody);
    if (result.success) successCount++;
  }
  
  console.log(`✅ Notification: ${successCount} succès`);
  res.json({ success: true, successCount });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, totalAdmins: adminTokens.length });
});

router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  res.json({ success: true });
});

module.exports = router;