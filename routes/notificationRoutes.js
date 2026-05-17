// routes/notificationRoutes.js
// ─── Fichier existant + ajout de POST /send-bill en bas ───

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

// ─── Routes existantes inchangées ───────────────────────────

router.post('/register-admin', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token requis' });
  await AdminToken.findOneAndUpdate({ token }, { token }, { upsert: true });
  console.log(`✅ Token admin enregistré en DB`);
  res.json({ success: true });
});

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

  const expiredTokens = tokens.filter((_, i) => results[i].status === 'rejected');
  if (expiredTokens.length > 0) {
    await AdminToken.deleteMany({ token: { $in: expiredTokens } });
  }

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Notifications admin: ${successCount}/${results.length}`);
  res.json({ success: true, successCount });
});

router.post('/order-status', async (req, res) => {
  const { orderId, newStatus } = req.body;

  if (!orderId || !newStatus) {
    return res.status(400).json({ success: false, message: 'orderId et newStatus requis' });
  }

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
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    
    if (!order.fcmToken) {
      return res.json({ success: false, message: 'Pas de token client pour cette commande' });
    }

    const result = await admin.messaging().send({
      token: order.fcmToken,
      notification: { title: message.title, body: message.body },
      data: { 
        orderId: String(orderId), 
        type: 'order_status',
        status: newStatus,
        timestamp: Date.now().toString()
      },
      android: {
        priority: message.priority === 'high' ? 'high' : 'normal',
        notification: { sound: 'default', channelId: 'order_status' }
      },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    });

    res.json({ success: true, message: `Notification ${newStatus} envoyée`, result });
    
  } catch (error) {
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      await Order.findByIdAndUpdate(orderId, { fcmToken: null });
    }
    res.status(500).json({ success: false, error: error.message, code: error.code });
  }
});

router.post('/custom-notification', async (req, res) => {
  const { orderId, title, body } = req.body;
  
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
      data: { orderId: String(orderId), type: 'custom', timestamp: Date.now().toString() }
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/broadcast', async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'title et body requis' });
  }
  
  try {
    const orders = await Order.find({ 
      fcmToken: { $ne: null, $exists: true },
      status: { $ne: 'archived' }
    });
    const uniqueTokens = [...new Set(orders.map(o => o.fcmToken))];
    if (uniqueTokens.length === 0) {
      return res.json({ success: false, message: 'Aucun token client trouvé' });
    }
    
    const results = await Promise.allSettled(
      uniqueTokens.map(token =>
        admin.messaging().send({
          token,
          notification: { title, body },
          data: { type: 'broadcast', timestamp: Date.now().toString() }
        })
      )
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    res.json({ success: true, successCount, totalTokens: uniqueTokens.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  const adminCount = await AdminToken.countDocuments();
  const uniqueClientTokens = await Order.distinct('fcmToken', { 
    fcmToken: { $ne: null, $exists: true } 
  });
  res.json({ 
    success: true, 
    totalAdmins: adminCount,
    totalClientTokens: uniqueClientTokens.length,
    totalOrdersWithToken: await Order.countDocuments({ fcmToken: { $ne: null, $exists: true } })
  });
});

router.post('/reset-tokens', async (req, res) => {
  await AdminToken.deleteMany({});
  res.json({ success: true });
});

router.post('/cleanup-client-tokens', async (req, res) => {
  try {
    const orders = await Order.find({ fcmToken: { $ne: null } });
    let cleaned = 0;
    for (const order of orders) {
      try {
        await admin.messaging().send({ token: order.fcmToken, data: { test: 'true' } });
      } catch (error) {
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          await Order.findByIdAndUpdate(order._id, { fcmToken: null });
          cleaned++;
        }
      }
    }
    res.json({ success: true, cleanedTokens: cleaned });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// NOUVEAU : POST /api/notifications/send-bill
// Envoie une notification push au(x) client(s) d'une table
// pour les avertir que leur addition est disponible
// ─────────────────────────────────────────────────────────────
router.post('/send-bill', async (req, res) => {
  const { fcmTokens, tableNumber, total } = req.body;

  if (!fcmTokens || fcmTokens.length === 0) {
    return res.json({ success: false, message: 'Aucun token fourni' });
  }

  if (!tableNumber || !total) {
    return res.status(400).json({ success: false, message: 'tableNumber et total requis' });
  }

  try {
    const results = await Promise.allSettled(
      fcmTokens.map(token =>
        admin.messaging().send({
          token,
          notification: {
            title: '🧾 Votre addition est prête',
            body:  `Table ${tableNumber} — Total : ${total}€`
          },
          data: {
            type:        'bill_ready',
            tableNumber: String(tableNumber),
            total:       String(total),
            timestamp:   Date.now().toString()
          },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'order_status' }
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } }
          }
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedTokens  = fcmTokens.filter((_, i) => results[i].status === 'rejected');

    if (failedTokens.length > 0) {
      console.warn(`⚠️ ${failedTokens.length} token(s) invalide(s) pour table ${tableNumber}`);
    }

    console.log(`📤 Notification addition envoyée — Table ${tableNumber} — ${successCount}/${fcmTokens.length} ok`);
    res.json({ success: true, successCount, totalTokens: fcmTokens.length });

  } catch (err) {
    console.error('❌ Erreur send-bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/test-notification-to-all-admins', async (req, res) => {
  const adminTokens = await AdminToken.find();
  const tokens = adminTokens.map(d => d.token);
  
  console.log(`📤 Envoi test à ${tokens.length} admins`);
  
  const results = await Promise.allSettled(
    tokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title: '🔔 Test Admin', body: 'Notification de test' },
        data: { type: 'test', timestamp: Date.now().toString() }
      })
    )
  );
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected');
  
  failures.forEach((f, i) => {
    console.error(`❌ Échec token ${i}:`, f.reason?.code, f.reason?.message);
  });
  
  res.json({ 
    success: true, 
    successCount,
    totalTokens: tokens.length,
    failures: failures.length,
    details: failures.map(f => ({ error: f.reason?.code }))
  });
});

// ===== ROUTE DE DÉBOGAGE POUR VOIR LES TOKENS ADMIN =====
router.get('/debug-admin-tokens', async (req, res) => {
  try {
    const tokens = await AdminToken.find();
    console.log(`📊 ${tokens.length} tokens admin enregistrés:`);
    tokens.forEach((t, i) => {
      console.log(`  ${i+1}. ${t.token.substring(0, 50)}...`);
    });
    res.json({ 
      count: tokens.length, 
      tokens: tokens.map(t => ({ 
        id: t._id, 
        tokenPreview: t.token.substring(0, 50) + '...',
        createdAt: t.createdAt 
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dans notificationRoutes.js, ajoutez :
router.get('/debug-all-tokens', async (req, res) => {
  try {
    // Compter dans AdminToken
    const adminTokens = await AdminToken.find();
    console.log(`📊 AdminToken.find(): ${adminTokens.length} tokens`);
    
    // Chercher TOUS les tokens dans n'importe quelle collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const results = {};
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments({ token: { $exists: true } });
      if (count > 0) {
        const tokens = await db.collection(collection.name).find({ token: { $exists: true } }).toArray();
        results[collection.name] = { count, tokens: tokens.map(t => ({ id: t._id, token: t.token?.substring(0, 50) })) };
      }
    }
    
    res.json({ 
      adminTokensCount: adminTokens.length,
      adminTokens: adminTokens.map(t => ({ id: t._id, token: t.token?.substring(0, 50) })),
      allCollectionsWithTokens: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dans notificationRoutes.js, ajoutez cette route
router.post('/manual-add-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token requis' });
  }
  
  try {
    // Méthode 1: Insertion directe avec MongoDB driver
    const db = mongoose.connection.db;
    const collection = db.collection('admintokens');
    
    // Supprimer l'ancien token s'il existe
    await collection.deleteOne({ token: token });
    
    // Insérer le nouveau
    const result = await collection.insertOne({
      token: token,
      createdAt: new Date()
    });
    
    console.log(`✅ Token inséré directement: ${token.substring(0, 30)}...`);
    console.log(`📊 ID d'insertion: ${result.insertedId}`);
    
    // Vérifier
    const count = await collection.countDocuments();
    console.log(`📊 Total tokens dans admintokens: ${count}`);
    
    res.json({ 
      success: true, 
      insertedId: result.insertedId,
      totalTokens: count 
    });
    
  } catch (error) {
    console.error('❌ Erreur insertion:', error);
    res.status(500).json({ error: error.message });
  }
});
// ========================================================
module.exports = router;