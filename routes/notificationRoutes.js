// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// ✅ Initialisation avec variables d'environnement (plus fiable sur Vercel)
if (!admin.apps.length) {
  try {
    // Vérifier que les variables existent
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Variables Firebase manquantes');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase Admin initialisé avec succès (via env)');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  }
}

// ... reste du code inchangé