const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const mongoose = require('mongoose');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "restaurant-signature-16476",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

// Schéma simple pour stocker les tokens admin
const AdminToken = mongoose.models.AdminToken || mongoose.model('AdminToken', new mongoose.Schema({
  token: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
}));

// Schéma Order (référence, pas de création ici)
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
  fcmToken: { type: String, default: null }
}, { strict: false }));

// Route pour enregistrer le token d'un admin
router.post('/register-admin', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token requis' });
  await AdminToken.findOneAndUpdate({ token }, { token }, { upsert: true });
  console.log(`✅ Token admin enregistré en DB`);
  res.json({ success: true });
});

// Route pour tester un token
router.post('/test-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token manquant' });
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title: '🔔 Test', body: 'Notification fonctionnelle !' }
    });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour notifier les admins d'une nouvelle commande
router.post('/new-order', async (req, res) => {
  const { orderId, customerName, total, mode, tableNumber, paymentMethod } = req.body;

  const adminTokenDocs = await AdminToken.find();
  const tokens = adminTokenDocs.map(d => d.token);

  if (tokens.length === 0) return res.json({ success: false, message: 'Aucun admin' });

  let body = `${customerName} - ${total}€`;
  if (mode === 'Livraison') body = `🚚 Livraison: ${body}`;
  else if (tableNumber) body = `🍽️ Table ${tableNumber}: ${body}`;
  
  if (paymentMethod === 'Caisse') body += ' (Paiement caisse)';

  const results = await Promise.allSettled(
    tokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title: '🆕 Nouvelle commande !', body },
        data: { 
          orderId: String(orderId), 
          type: 'new_order',
          timestamp: Date.now().toString()
        }
      })
    )
  );

  // Supprimer les tokens expirés
  const expiredTokens = tokens.filter((_, i) => results[i].status === 'rejected');
  if (expiredTokens.length > 0) {
    await AdminToken.deleteMany({ token: { $in: expiredTokens } });
  }

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Notifications admin: ${successCount}/${results.length}`);
  res.json({ success: true, successCount });
});

// NOUVELLE ROUTE: Notifier le client du changement de statut de commande
router.post('/order-status', async (req, res) => {
  const { orderId, newStatus } = req.body;

  if (!orderId || !newStatus) {
    return res.status(400).json({ success: false, message: 'orderId et newStatus requis' });
  }

  // Messages personnalisés selon le statut
  const statusMessages = {
    pending: { 
      title: '📝 Commande reçue', 
      body: 'Votre commande a été reçue et va être préparée.',
      priority: 'high'
    },
    pending_payment: { 
      title: '💳 En attente de paiement', 
      body: 'Veuillez finaliser votre paiement pour confirmer la commande.',
      priority: 'high'
    },
    cooking: { 
      title: '👨‍🍳 En cuisine !', 
      body: 'Votre commande est en cours de préparation par notre chef.',
      priority: 'normal'
    },
    done: { 
      title: '✅ Commande prête !', 
      body: 'Votre commande est prête à être récupérée. Bon appétit !',
      priority: 'high'
    },
    archived: { 
      title: '📦 Commande terminée', 
      body: 'Merci pour votre visite ! À bientôt chez Signature.',
      priority: 'normal'
    },
    cancelled: { 
      title: '❌ Commande annulée', 
      body: 'Votre commande a été annulée. Contactez-nous pour plus d\'informations.',
      priority: 'high'
    }
  };

  const message = statusMessages[newStatus];
  if (!message) {
    return res.json({ success: false, message: 'Statut sans notification configurée' });
  }

  try {
    // Récupère la commande pour obtenir le token FCM du client
    const order = await Order.findById(orderId);
    
    if (!order) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    
    if (!order.fcmToken) {
      console.log(`⚠️ Pas de token FCM pour la commande ${orderId}, impossible d'envoyer la notification au client`);
      return res.json({ success: false, message: 'Pas de token client pour cette commande' });
    }

    console.log(`📤 Envoi notification à client pour commande ${orderId} - Statut: ${newStatus}`);
    console.log(`🔑 Token client: ${order.fcmToken.substring(0, 50)}...`);

    // Envoyer la notification au client
    const result = await admin.messaging().send({
      token: order.fcmToken,
      notification: { 
        title: message.title, 
        body: message.body 
      },
      data: { 
        orderId: String(orderId), 
        type: 'order_status',
        status: newStatus,
        timestamp: Date.now().toString()
      },
      android: {
        priority: message.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'order_status'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    });

    console.log(`✅ Notification client envoyée avec succès!`);
    console.log(`📊 Résultat Firebase:`, result);
    
    res.json({ 
      success: true, 
      message: `Notification ${newStatus} envoyée au client`,
      result: result 
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification client:', error);
    console.error('📋 Détails erreur:', {
      code: error.code,
      message: error.message,
      status: error.status
    });
    
    // Si le token est invalide/expiré, on le supprime de la commande
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log(`⚠️ Token invalide pour commande ${orderId}, suppression...`);
      await Order.findByIdAndUpdate(orderId, { fcmToken: null });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code
    });
  }
});

// Route pour envoyer une notification personnalisée à un client spécifique
router.post('/custom-notification', async (req, res) => {
  const { orderId, title, body, priority = 'normal' } = req.body;
  
  if (!orderId || !title || !body) {
    return res.status(400).json({ success: false, message: 'orderId, title et body requis' });
  }
  
  try {
    const order = await Order.findById(orderId);
    
    if (!order || !order.fcmToken) {
      return res.status(404).json({ success: false, message: 'Commande ou token client non trouvé' });
    }
    
    const result = await admin.messaging().send({
      token: order.fcmToken,
      notification: { title, body },
      data: {
        orderId: String(orderId),
        type: 'custom',
        timestamp: Date.now().toString()
      }
    });
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Erreur envoi notification personnalisée:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer une notification à tous les clients (broadcast)
router.post('/broadcast', async (req, res) => {
  const { title, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'title et body requis' });
  }
  
  try {
    // Récupérer toutes les commandes avec un token valide
    const orders = await Order.find({ 
      fcmToken: { $ne: null, $exists: true },
      status: { $ne: 'archived' }
    });
    
    const uniqueTokens = [...new Set(orders.map(o => o.fcmToken))];
    
    if (uniqueTokens.length === 0) {
      return res.json({ success: false, message: 'Aucun token client trouvé' });
    }
    
    console.log(`📤 Envoi de broadcast à ${uniqueTokens.length} clients`);
    
    const results = await Promise.allSettled(
      uniqueTokens.map(token =>
        admin.messaging().send({
          token,
          notification: { title, body },
          data: {
            type: 'broadcast',
            timestamp: Date.now().toString()
          }
        })
      )
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Broadcast envoyé à ${successCount}/${uniqueTokens.length} clients`);
    
    res.json({ 
      success: true, 
      successCount,
      totalTokens: uniqueTokens.length
    });
  } catch (error) {
    console.error('❌ Erreur broadcast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour obtenir les statistiques
router.get('/stats', async (req, res) => {
  const adminCount = await AdminToken.countDocuments();
  
  // Compter les clients avec token
  const ordersWithToken = await Order.countDocuments({ 
    fcmToken: { $ne: null, $exists: true } 
  });
  
  const uniqueClientTokens = await Order.distinct('fcmToken', { 
    fcmToken: { $ne: null, $exists: true } 
  });
  
  res.json({ 
    success: true, 
    totalAdmins: adminCount,
    totalClientTokens: uniqueClientTokens.length,
    totalOrdersWithToken: ordersWithToken
  });
});

// Route pour réinitialiser les tokens admin
router.post('/reset-tokens', async (req, res) => {
  await AdminToken.deleteMany({});
  res.json({ success: true });
});

// Route pour supprimer les tokens clients expirés
router.post('/cleanup-client-tokens', async (req, res) => {
  try {
    const orders = await Order.find({ fcmToken: { $ne: null } });
    let cleaned = 0;
    
    for (const order of orders) {
      try {
        // Tester le token avec une notification silencieuse
        await admin.messaging().send({
          token: order.fcmToken,
          data: { test: 'true' }
        });
      } catch (error) {
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          await Order.findByIdAndUpdate(order._id, { fcmToken: null });
          cleaned++;
          console.log(`🧹 Token expiré supprimé pour commande ${order._id}`);
        }
      }
    }
    
    res.json({ success: true, cleanedTokens: cleaned });
  } catch (error) {
    console.error('❌ Erreur nettoyage tokens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;