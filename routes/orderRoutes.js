const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Définition du modèle directement ici si tu n'as pas de dossier models/
const OrderSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  customer: { name: String, address: String },
  items: Array,
  total: Number,
  amountPaid: Number,
  mode: String,
  details: Object,
  status: { type: String, default: 'pending', enum: ['pending', 'cooking', 'done'] }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// POST : Créer une commande
router.post('/', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET : Suivre les commandes d'un client
router.get('/track/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    // On récupère les commandes des dernières 24h
    const orders = await Order.find({
      clientId: clientId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT : Modifier le statut (ou n'importe quel champ de la commande)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id, 
        { status }, 
        { new: true }
    );
    // Note : On renvoie 'data' pour matcher la structure attendue par certains de tes composants
    res.json({ success: true, data: updatedOrder }); 
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET : Lister toutes les commandes (pour l'interface Admin)
router.get('/', async (req, res) => {
  try {
    // On récupère tout, trié par date (les plus récentes en premier)
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;