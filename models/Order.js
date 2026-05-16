// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  customer: {
    name: { type: String, default: "Client Signature" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" }
  },
  items: [{
    productId: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    chosenAccompaniment: { type: String, default: "Aucun" },
    supplements: { type: Array, default: [] },
    type: { type: String, default: 'Signature' }
  }],
  total: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  mode: { 
    type: String, 
    enum: ['on_site', 'booking', 'delivery'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'pending_payment', 'cooking', 'done', 'archived'],
    default: 'pending'
  },
  details: {
    consumeMode: { type: String, enum: ['dine_in', 'take_away'], default: null },
    tableNumber: { type: String, default: null },
    guestCount: { type: String, default: null },
    bookingSlot: { type: String, default: null },
    deliveryTime: { type: String, default: null },
    paymentStatus: { type: String, enum: ['pending_stripe', 'pending_at_counter', 'paid'], default: 'pending_at_counter' },
    deliveryService: { type: String, default: null },
    deliveryQuoteId: { type: String, default: null },
    deliveryFee: { type: Number, default: 0 },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);