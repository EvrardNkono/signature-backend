const mongoose = require('mongoose');

// On garde la connexion en mémoire pour la réutiliser entre les appels
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return; // Si déjà connecté, on ne fait rien
  }

  try {
    const dbUri = process.env.MONGO_URI;

    if (!dbUri) {
      console.error("ERREUR : MONGO_URI manquante dans les variables d'environnement.");
      return; 
    }

    const conn = await mongoose.connect(dbUri);

    isConnected = conn.connections[0].readyState;
    
    console.log(`[MongoDB] Connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Erreur MongoDB] : ${error.message}`);
    // SURTOUT PAS de process.exit(1) ici sur Vercel
    throw error; // On laisse l'erreur remonter pour que Vercel puisse la logger
  }
};

module.exports = connectDB;