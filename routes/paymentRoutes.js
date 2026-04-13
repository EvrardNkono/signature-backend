const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Définition de la route
router.post('/create-checkout-session', paymentController.createCheckoutSession);

// L'exportation CRUCIALE pour Express
module.exports = router;