// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

// ✅ Utilisation de l'API REST Firebase (pas besoin du SDK Admin)
// CORRECTION : Utilise FIREBASE_API_KEY au lieu de FIREBASE_SERVER_KEY
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.FIREBASE_SERVER_KEY;

// Stockage temporaire des tokens (en production, utilisez une base de données)
let adminTokens = [];

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
  
  if (!FIREBASE_API_KEY) {
    console.error('❌ FIREBASE_API_KEY non configurée');
    return res.status(500).json({ success: false, error: 'Clé Firebase manquante' });
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
  
  // Préparer la charge utile pour l'API REST Firebase
  const payload = {
    notification: {
      title: '🆕 Nouvelle commande !',
      body: messageBody
    },
    data: {
      orderId: orderId,
      type: 'new_order',
      click_action: '/admin/orders'
    },
    registration_ids: adminTokens
  };
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log(`✅ Notification: ${data.success} succès, ${data.failure} échecs`);
    res.json({ success: true, successCount: data.success, results: data.results });
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

// Route de test pour vérifier un token individuel
router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }
  
  if (!FIREBASE_API_KEY) {
    return res.status(500).json({ success: false, error: 'Clé Firebase manquante' });
  }
  
  console.log('🔍 Test du token:', token.substring(0, 30) + '...');
  
  const payload = {
    notification: {
      title: '🔔 Test de notification',
      body: 'Si vous voyez ce message, les notifications fonctionnent !'
    },
    to: token  // Envoi à un seul token
  };
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('✅ Test réussi:', data);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Route pour réinitialiser les tokens (si besoin)
router.post('/reset-tokens', (req, res) => {
  adminTokens = [];
  console.log('🗑️ Tous les tokens ont été réinitialisés');
  res.json({ success: true, message: 'Tokens réinitialisés' });
});

// Route pour debug
router.get('/debug-tokens', (req, res) => {
  console.log('🔍 Tokens stockés:', adminTokens);
  res.json({ 
    success: true, 
    tokens: adminTokens,
    count: adminTokens.length 
  });
});

module.exports = router;