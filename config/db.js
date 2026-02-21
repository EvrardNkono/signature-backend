const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // On récupère l'URL Cloud en priorité, peu importe le mode (prod ou dev)
    const dbUri = process.env.MONGO_URI;

    if (!dbUri) {
      throw new Error("La variable MONGO_URI est absente du fichier .env");
    }

    // Connexion avec des options robustes
    const conn = await mongoose.connect(dbUri);

    console.log(`-----------------------------------------`);
    console.log(`[MongoDB] Connexion réussie : ${conn.connection.host}`);
    console.log(`[Base de données] : ${conn.connection.name}`);
    console.log(`[Mode] : ${process.env.NODE_ENV}`);
    console.log(`[Source] : CLOUD (Atlas)`);
    console.log(`-----------------------------------------`);
  } catch (error) {
    console.error(`-----------------------------------------`);
    console.error(`[Erreur MongoDB] ${error.message}`);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("ASTUCE : Vérifie que ton IP est autorisée sur MongoDB Atlas (Network Access)");
    }
    console.error(`-----------------------------------------`);

    process.exit(1);
  }
};

module.exports = connectDB;