// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Route pour créer une session Stripe
router.post('/create-checkout-session', paymentController.createCheckoutSession);

// Route pour le webhook Stripe (body raw)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;