const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const admin = require('firebase-admin');

// ─── Référence au modèle Order existant ───
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

// ─── MODÈLE BILL ───
const BillSchema = new mongoose.Schema({
  tableNumber:  { type: String, required: true },
  clientIds:    { type: [String], default: [] },
  fcmTokens:    { type: [String], default: [] },
  orderIds:     { type: [String], default: [] },
  total:        { type: Number,  required: true },
  status: {
    type: String,
    enum: ['pending', 'requested_counter', 'paid', 'closed'],
    default: 'pending'
  },
  orders: { type: Array, default: [] },
}, { timestamps: true });

BillSchema.index({ clientIds: 1, status: 1 });
BillSchema.index({ tableNumber: 1, status: 1 });

const Bill = mongoose.models.Bill || mongoose.model('Bill', BillSchema);

// ─── GET /api/bills/check/:clientId ───
router.get('/check/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId requis' });
    }

    const bill = await Bill.findOne({
      clientIds: clientId,
      status: { $in: ['pending', 'requested_counter'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, bill: bill || null });
  } catch (err) {
    console.error('❌ Erreur check bill:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/bills ───
router.post('/', async (req, res) => {
  try {
    const { tableNumber, clientIds, fcmTokens, orderIds, total } = req.body;

    if (!tableNumber || !total) {
      return res.status(400).json({ success: false, message: 'tableNumber et total requis' });
    }

    const existing = await Bill.findOne({ tableNumber, status: 'pending' });
    if (existing) {
      existing.orderIds = orderIds || existing.orderIds;
      existing.fcmTokens = fcmTokens || existing.fcmTokens;
      existing.clientIds = clientIds || existing.clientIds;
      existing.total = total;
      await existing.save();
      return res.json({ success: true, bill: existing });
    }

    let populatedOrders = [];
    if (orderIds && orderIds.length > 0) {
      populatedOrders = await Order.find({ _id: { $in: orderIds } })
        .select('items total createdAt')
        .lean();
    }

    const bill = new Bill({
      tableNumber,
      clientIds: clientIds || [],
      fcmTokens: fcmTokens || [],
      orderIds: orderIds || [],
      total,
      status: 'pending',
      orders: populatedOrders,
    });

    await bill.save();
    console.log(`🧾 Bill créée — Table ${tableNumber} — ${total.toFixed(2)}€`);
    res.status(201).json({ success: true, bill });
  } catch (err) {
    console.error('❌ Erreur création bill:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/bills/:id/request-counter-payment ───
router.post('/:id/request-counter-payment', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill non trouvée' });
    }

    bill.status = 'requested_counter';
    await bill.save();
    console.log(`💵 Paiement caisse demandé — Table ${bill.tableNumber}`);

    // Notifier les admins
    try {
      const AdminToken = mongoose.models.AdminToken;
      if (AdminToken) {
        const adminDocs = await AdminToken.find();
        const adminTokens = adminDocs.map(d => d.token).filter(Boolean);
        if (adminTokens.length > 0) {
          await Promise.allSettled(
            adminTokens.map(token =>
              admin.messaging().send({
                token,
                notification: {
                  title: '💵 Paiement caisse demandé',
                  body: `Table ${bill.tableNumber} souhaite régler — ${bill.total.toFixed(2)}€`
                },
                data: {
                  type: 'counter_payment_request',
                  billId: String(bill._id),
                  tableNumber: String(bill.tableNumber),
                  total: String(bill.total),
                  timestamp: Date.now().toString()
                }
              })
            )
          );
        }
      }
    } catch (notifErr) {
      console.warn('⚠️ Notification admin non envoyée:', notifErr.message);
    }

    res.json({ success: true, bill });
  } catch (err) {
    console.error('❌ Erreur request-counter-payment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── NOUVEAU : POST /api/bills/:id/close-tab (fermeture après paiement caisse) ───
router.post('/:id/close-tab', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, tableNumber } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill non trouvée' });
    }

    // Marquer la bill comme payée
    bill.status = 'paid';
    await bill.save();

    // Mettre à jour TOUTES les commandes de cette table/client
    const orders = await Order.find({
      clientId: clientId,
      'details.tableNumber': tableNumber,
      status: { $ne: 'archived' }
    });

    for (const order of orders) {
      if (order.details?.paymentStatus === 'open_tab') {
        order.details.paymentStatus = 'closed';
      }
      order.isPaid = true;
      order.paidAt = new Date();
      await order.save();
    }

    console.log(`✅ Bill fermée (paiement caisse) — Table ${tableNumber} — ${bill.total.toFixed(2)}€`);
    res.json({ success: true, message: 'Tab fermée avec succès' });
  } catch (err) {
    console.error('❌ Erreur close-tab:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/bills/:id/mark-paid (pour Stripe webhook) ───
router.put('/:id/mark-paid', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status: 'paid' },
      { new: true }
    );
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill non trouvée' });
    }
    console.log(`✅ Bill payée — Table ${bill.tableNumber} — ${bill.total.toFixed(2)}€`);
    res.json({ success: true, bill });
  } catch (err) {
    console.error('❌ Erreur mark-paid:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/bills ───
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : { status: { $in: ['pending', 'requested_counter'] } };
    const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.Bill = Bill;