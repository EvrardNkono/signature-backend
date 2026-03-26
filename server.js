const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// 1. Chargement des variables d'environnement (.env)
dotenv.config();

// 2. Connexion à MongoDB
connectDB();

const app = express();

// 3. Middlewares
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:3000", 
    "https://signature-backend-alpha.vercel.app",
    "https://restaurantsignature.surge.sh",
    "https://restaurant-signature.surge.sh",
    "https://restaurant-signature-delta.vercel.app",
    "https://restaurant-signature-23tjk4ljf-evrardnkonos-projects.vercel.app",
    "https://restaurantsignature.fr",
    "https://www.restaurantsignature.fr", 
    "https://restaurantsignature.fr/"    
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

/** * OPTIMISATION POUR L'UPLOAD D'IMAGES (Base64)
 * Augmentation de la limite pour supporter les chaînes de caractères d'images
 */
app.use(express.json({ limit: '20mb' })); 
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// 4. Importation des Routes
const menuRoutes = require('./routes/menuRoutes');
const adRoutes = require('./routes/adRoutes');
const bannerRoutes = require('./routes/bannerRoutes'); 
const uberRoutes = require('./routes/uberRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const accompanimentRoutes = require('./routes/accompanimentRoutes');
const supplementRoutes = require('./routes/supplementRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes'); 
const chatRoutes = require('./routes/chatRoutes'); // <--- NOUVEAU : Import Gluttony

// 5. Utilisation des Routes
app.use('/api/menu', menuRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/banner', bannerRoutes); 
app.use('/api/uber', uberRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/accompaniments', accompanimentRoutes);
app.use('/api/supplements', supplementRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes); // <--- NOUVEAU : Route Gluttony branchée

// Route de test
app.get('/', (req, res) => {
  res.send('✦ API Signature lancée et opérationnelle sur Vercel... ✦');
});

// 6. Gestion du Port & Exportation
const PORT = process.env.PORT || 5000;

// IMPORTANT : On ne lance le serveur avec app.listen que si on n'est PAS sur Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`[Serveur] Lancé sur le port ${PORT}`);
    console.log(`[Mode] Développement`);
    console.log(`[Status] Menu, Categories, Orders & Gluttony Chatbot OK`); 
    console.log(`-----------------------------------------`);
  });
}

// Exportation pour Vercel
module.exports = app;