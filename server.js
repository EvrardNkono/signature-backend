const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const adminAuthRoutes = require('./routes/adminAuth');
// ========== 1. CHARGER LES VARIABLES D'ENVIRONNEMENT EN PREMIER ==========
dotenv.config();

// ========== 2. MAINTENANT SEULEMENT, ON PEUT LES UTILISER ==========
console.log('🚀 Serveur démarré sur Vercel');
console.log('MONGODB_URI existe ?', !!process.env.MONGODB_URI);
console.log('FRONTEND_URL existe ?', !!process.env.FRONTEND_URL);

// ========== 3. CONNEXION À MONGODB ==========
const connectDB = require('./config/db');
const mongoose = require('mongoose');
connectDB();

const app = express();

// ========== TOKEN EXPORT PUBLIC (EN DUR) ==========
const EXPORT_PUBLIC_TOKEN = "SignatureExport2024!";

// ========== WEBHOOK STRIPE ==========
const paymentController = require('./controllers/paymentController');
app.post('/api/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// ========== 4. MIDDLEWARES ==========
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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: true
}));

app.use(express.json({ limit: '20mb' })); 
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// ========== 5. ROUTES ==========
const menuRoutes          = require('./routes/menuRoutes');
const bannerRoutes        = require('./routes/bannerRoutes'); 
const uberRoutes          = require('./routes/uberRoutes');
const categoryRoutes      = require('./routes/categoryRoutes');
const accompanimentRoutes = require('./routes/accompanimentRoutes');
const supplementRoutes    = require('./routes/supplementRoutes');
const tableRoutes         = require('./routes/tableRoutes');
const orderRoutes         = require('./routes/orderRoutes'); 
const chatRoutes          = require('./routes/chatRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const popupRoutes         = require('./routes/popupRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const billRoutes          = require('./routes/billRoutes');
const settingsRoutes      = require('./routes/settings');
const exportRoutes        = require('./routes/exportRoutes');  // ← AJOUTÉ

app.use('/api/menu',          menuRoutes);
app.use('/api/banner',        bannerRoutes); 
app.use('/api/uber',          uberRoutes); 
app.use('/api/categories',    categoryRoutes);
app.use('/api/accompaniments',accompanimentRoutes);
app.use('/api/supplements',   supplementRoutes);
app.use('/api/tables',        tableRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/popups',        popupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bills',         billRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/admin-auth',    adminAuthRoutes);
app.use('/api/export',        exportRoutes);  // ← AJOUTÉ

// ========== ROUTE SIMPLE POUR EXPORT IMAGES (sans archiver) ==========
app.get('/api/export-images', async (req, res) => {
  try {
    const Menu = require('./models/Menu');
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image');
    
    res.json({
      success: true,
      count: plats.length,
      images: plats.map(p => ({
        name: p.name,
        url: p.image
      }))
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ROUTE POUR LA LISTE DES IMAGES (admin) ==========
app.get('/api/export/images-list', async (req, res) => {
  try {
    const Menu = require('./models/Menu');
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image category');
    
    res.json({
      success: true,
      count: plats.length,
      images: plats.map(p => ({
        name: p.name,
        url: p.image,
        category: p.category
      }))
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT PUBLIC (SANS AUTH) ====================

// Route pour vérifier le token
app.get('/api/public/check-token', async (req, res) => {
  try {
    const { token } = req.query;
    const isValid = (token === EXPORT_PUBLIC_TOKEN);
    
    res.json({ 
      valid: isValid,
      message: isValid ? "Token valide" : "Token invalide"
    });
  } catch (error) {
    console.error("❌ Erreur check-token:", error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// Route pour télécharger l'export complet (images + CSV)
app.get('/api/public/export-complete', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || token !== EXPORT_PUBLIC_TOKEN) {
      return res.status(401).json({ 
        success: false, 
        error: "Token invalide. Veuillez utiliser le lien fourni par l'administrateur." 
      });
    }
    
    const exportController = require('./controllers/exportController');
    await exportController.exportComplete(req, res);
    
  } catch (error) {
    console.error("❌ Erreur export public:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la génération de l'export" 
    });
  }
});

// ========== ROUTES DE TEST ==========
app.get('/', (req, res) => {
  res.send('✦ API Signature lancée et opérationnelle... ✦');
});

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

// ========== 6. PORT ==========
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`[Serveur] Lancé sur le port ${PORT}`);
    console.log(`[Mode] ${process.env.NODE_ENV}`);
    console.log(`[Status] Routes & Paiements Stripe OK`);
    console.log(`[Export Routes] Disponibles sur /api/export/*`);
    console.log(`[Export Public] GET /api/public/export-complete?token=${EXPORT_PUBLIC_TOKEN}`);
    console.log(`-----------------------------------------`);
  });
}

module.exports = app;