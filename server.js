const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const mongoose = require('mongoose');  // ← IMPORTANT

console.log('🚀 Serveur démarré sur Vercel');
console.log('MONGODB_URI existe ?', !!process.env.MONGODB_URI);

// 1. Chargement des variables d'environnement (.env)
dotenv.config();

// 2. Connexion à MongoDB
connectDB();

const app = express();

// ========== WEBHOOK STRIPE ==========
const paymentController = require('./controllers/paymentController');
app.post('/api/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// 3. Middlewares
app.use(cors({
  origin: [
    "http://localhost:5174",
    "http://localhost:5173", 
    "http://localhost:3000", 
    "https://signature-backend-alpha.vercel.app",
    "https://restaurantsignature.surge.sh",
    "https://restaurant-signature.surge.sh",
    "https://restaurant-signature-delta.vercel.app",
    "https://restaurant-signature-23tjk4ljf-evrardnkonos-projects.vercel.app",
    "https://restaurantsignature.fr",
    "https://www.restaurantsignature.fr"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: true
}));

app.use(express.json({ limit: '20mb' })); 
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// 4. Importation des Routes
const menuRoutes = require('./routes/menuRoutes');
const bannerRoutes = require('./routes/bannerRoutes'); 
const uberRoutes = require('./routes/uberRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const accompanimentRoutes = require('./routes/accompanimentRoutes');
const supplementRoutes = require('./routes/supplementRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes'); 
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const popupRoutes = require('./routes/popupRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// 5. Utilisation des Routes
app.use('/api/menu', menuRoutes);
app.use('/api/banner', bannerRoutes); 
app.use('/api/uber', uberRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/accompaniments', accompanimentRoutes);
app.use('/api/supplements', supplementRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/popups', popupRoutes);
app.use('/api/notifications', notificationRoutes);

// Route de test
app.get('/', (req, res) => {
  res.send('✦ API Signature lancée et opérationnelle... ✦');
});

// Routes de diagnostic
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      mongodb: !!process.env.MONGODB_URI,
      frontend: !!process.env.FRONTEND_URL,
      node: process.version,
      environment: process.env.NODE_ENV
    },
    mongodb_status: mongoose.connection && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ pong: true, time: Date.now() });
});

// 6. Gestion du Port & Exportation
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`[Serveur] Lancé sur le port ${PORT}`);
    console.log(`[Mode] ${process.env.NODE_ENV}`);
    console.log(`[Status] Routes & Paiements Stripe OK`);
    console.log(`[Popup] Routes disponibles sur /api/popups`);
    console.log(`[Notifications] Routes disponibles sur /api/notifications`);
    console.log(`-----------------------------------------`);
  });
}

module.exports = app;