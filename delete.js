// delete-popup.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://evrardnkono870_signature_user:Chesstitan1@cluster2.kzgjrsk.mongodb.net/signature_db?retryWrites=true&w=majority&appName=Cluster2";

async function deletePopups() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Récupérer le modèle Popup
    const Popup = require('./models/Popup');
    
    // Voir ce qui existe
    const existing = await Popup.find();
    console.log(`📦 Popups trouvées: ${existing.length}`);
    
    if (existing.length > 0) {
      console.log('Contenu:', existing);
      
      // Supprimer tout
      const result = await Popup.deleteMany({});
      console.log(`🗑️ Supprimé ${result.deletedCount} popup(s)`);
    } else {
      console.log('Aucune popup à supprimer');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

deletePopups();