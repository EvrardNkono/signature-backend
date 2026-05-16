// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
  try {
    // Chemin vers ton fichier JSON téléchargé depuis Firebase Console
    const serviceAccount = require('../firebase-adminsdk.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  }
}

// Stockage temporaire des tokens (en production, utilisez une base de données)
let adminTokens = [];  // ← Changé de userTokens à adminTokens

// Enregistrer un token ADMIN (depuis le panneau admin)
router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  
  if (!adminTokens.includes(token)) {
    adminTokens.push(token);
    console.log(`✅ Nouveau token ADMIN enregistré (${adminTokens.length} total)`);
  }
  
  res.json({ success: true, message: 'Token admin enregistré' });
});

// 🔔 NOUVELLE COMMANDE - Envoyer notification à l'admin UNIQUEMENT
router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, itemsCount, mode, tableNumber, paymentMethod } = req.body;
  
  console.log(`📦 Nouvelle commande #${orderId} - ${customerName} - ${total}€`);
  console.log(`📨 Envoi à ${adminTokens.length} admin(s) enregistré(s)`);
  
  if (adminTokens.length === 0) {
    console.log('⚠️ Aucun admin enregistré, notification non envoyée');
    return res.json({ success: false, message: 'Aucun admin enregistré' });
  }
  
  // Construction du message selon le contexte
  let messageBody = `${customerName} - ${total}€`;
  if (mode === 'Livraison') {
    messageBody = `🚚 Livraison: ${messageBody}`;
  } else if (mode === 'Réservation') {
    messageBody = `📅 Réservation: ${messageBody}`;
  } else if (tableNumber) {
    messageBody = `🍽️ Table ${tableNumber}: ${messageBody}`;
  }
  
  const message = {
    notification: {
      title: '🆕 Nouvelle commande !',
      body: messageBody
    },
    data: {
      orderId: orderId,
      type: 'new_order',
      click_action: '/admin/orders'
    },
    tokens: adminTokens
  };
  
  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Notification: ${response.successCount} succès, ${response.failureCount} échecs`);
    res.json({ success: true, successCount: response.successCount });
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtenir les statistiques (combien d'admins sont notifiés)
router.get('/stats', (req, res) => {
  res.json({ 
    success: true, 
    totalAdmins: adminTokens.length 
  });
});

// routes/notificationRoutes.js - Ajoute cette route après les autres

// Route de test pour vérifier un token individuel
router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  console.log('🔍 Test du token:', token.substring(0, 30) + '...');
  
  const message = {
    notification: {
      title: '🔔 Test de notification',
      body: 'Si vous voyez ce message, les notifications fonctionnent !'
    },
    token: token // Envoi à un seul token spécifique
  };
  
  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Test réussi:', response);
    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
    console.error('Détails:', error.errorInfo);
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: error.errorInfo 
    });
  }
});

// Route pour réinitialiser les tokens (si besoin)
router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  console.log('🗑️ Tous les tokens ont été réinitialisés');
  res.json({ success: true, message: 'Tokens réinitialisés' });
});

// routes/notificationRoutes.js - Ajoute cette route pour debug
router.get('/debug-tokens', (req, res) => {
  console.log('🔍 Tokens stockés:', adminTokens);
  res.json({ 
    success: true, 
    tokens: adminTokens,
    count: adminTokens.length 
  });
});
router.post('/register-admin', (req, res) => {
  const { token } = req.body;
  console.log('📝 Token reçu par backend:', token ? token.substring(0, 30) + '...' : 'AUCUN');
  console.log('📝 Longueur du token:', token ? token.length : 0);
  
  adminTokens = [token];
  console.log(`✅ Token ADMIN enregistré (${adminTokens.length} total)`);
  
  res.json({ success: true, message: 'Token admin enregistré' });
});

module.exports = router;