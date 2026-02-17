const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 1. On détermine quelle URL utiliser
    // Si NODE_ENV est 'production', on utilise la base en ligne, sinon la locale
    const dbUri = process.env.NODE_ENV === 'production' 
      ? process.env.MONGO_URI 
      : process.env.MONGO_URI_LOCAL;

    // 2. Tentative de connexion
    const conn = await mongoose.connect(dbUri);

    console.log(`-----------------------------------------`);
    console.log(`[MongoDB] Connexion réussie : ${conn.connection.host}`);
    console.log(`[Base de données] : ${conn.connection.name}`);
    console.log(`[Source] : ${process.env.NODE_ENV === 'production' ? 'CLOUD (Atlas)' : 'LOCAL (PC)'}`);
    console.log(`-----------------------------------------`);
  } catch (error) {
    console.error(`[Erreur MongoDB] ${error.message}`);
    
    // Petite astuce : Si la connexion échoue, on explique pourquoi
    if (process.env.NODE_ENV !== 'production') {
      console.log("CONSEIL : Vérifie que ton service MongoDB local est bien lancé (services.msc)");
    }

    process.exit(1);
  }
};

module.exports = connectDB;