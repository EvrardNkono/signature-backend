// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Définition du modèle directement ici
const OrderSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  fcmToken: { type: String, default: null }, // 👈 AJOUT : Token FCM du client
  customer: { 
    name: String, 
    address: String, 
    email: String, 
    phone: String 
  },
  items: Array,
  total: Number,
  amountPaid: Number,
  mode: String,
  details: Object,
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'pending_payment', 'cooking', 'done', 'archived', 'cancelled'] 
  }
}, { 
  timestamps: true 
});

// Index pour améliorer les performances des requêtes
OrderSchema.index({ clientId: 1, createdAt: -1 });
OrderSchema.index({ fcmToken: 1 });
OrderSchema.index({ status: 1 });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// POST : Créer une commande
router.post('/', async (req, res) => {
  try {
    // Validation basique des données requises
    if (!req.body.clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'clientId est requis' 
      });
    }

    // Log pour déboguer (optionnel, peut être supprimé en production)
    if (req.body.fcmToken) {
      console.log(`📱 Commande avec token FCM pour client ${req.body.clientId.substring(0, 8)}...`);
    }

    const newOrder = new Order(req.body);
    await newOrder.save();
    
    res.status(201).json({ 
      success: true, 
      order: newOrder,
      orderId: newOrder._id,
      data: newOrder
    });
  } catch (err) {
    console.error('❌ Erreur création commande:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET : Suivre les commandes d'un client
router.get('/track/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const orders = await Order.find({
      clientId: clientId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('❌ Erreur tracking commandes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT : Modifier le statut d'une commande
router.put('/:id', async (req, res) => {
  try {
    const { status, updatedAt } = req.body;
    
    // Validation du statut
    const validStatuses = ['pending', 'pending_payment', 'cooking', 'done', 'archived', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Statut invalide. Doit être parmi: ${validStatuses.join(', ')}` 
      });
    }

    // Mise à jour avec l'horodatage si fourni
    const updateData = { status };
    if (updatedAt) {
      updateData.updatedAt = updatedAt;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      });
    }

    console.log(`✅ Commande ${req.params.id} mise à jour: ${status}`);
    
    res.json({ 
      success: true, 
      data: updatedOrder,
      orderId: updatedOrder._id,
      status: updatedOrder.status
    });
  } catch (err) {
    console.error('❌ Erreur mise à jour commande:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET : Lister toutes les commandes (Admin)
router.get('/', async (req, res) => {
  try {
    // Support des filtres optionnels
    const { status, limit = 100, page = 1 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(query);
    
    res.json({ 
      success: true, 
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('❌ Erreur récupération commandes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET : Récupérer une commande spécifique
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      });
    }
    
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('❌ Erreur récupération commande:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE : Supprimer une commande (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    
    if (!deletedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      });
    }
    
    console.log(`🗑️ Commande ${req.params.id} supprimée`);
    res.json({ 
      success: true, 
      message: 'Commande supprimée avec succès' 
    });
  } catch (err) {
    console.error('❌ Erreur suppression commande:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH : Mettre à jour le token FCM d'une commande
router.patch('/:id/fcm-token', async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'fcmToken requis' 
      });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { fcmToken },
      { new: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Token FCM mis à jour',
      data: updatedOrder
    });
  } catch (err) {
    console.error('❌ Erreur mise à jour token FCM:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET : Statistiques des commandes (Admin)
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: { $in: ['done', 'archived'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);
    
    const uniqueClients = await Order.distinct('clientId').countDocuments();
    
    res.json({
      success: true,
      stats: {
        byStatus: stats,
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0
        },
        totalUniqueClients: uniqueClients,
        totalOrders: await Order.countDocuments()
      }
    });
  } catch (err) {
    console.error('❌ Erreur statistiques:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== EXPORTATION ==========
module.exports = router;
module.exports.Order = Order;