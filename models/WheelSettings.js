const mongoose = require('mongoose');

const WheelSettingsSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: "🎡 Tentez votre chance"
  },
  subtitle: {
    type: String,
    default: "Gagnez des plats offerts !"
  },
  buttonText: {
    type: String,
    default: "Jouer"
  },
  // Pour suivre qui a modifié
  updatedBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Mettre à jour updatedAt avant chaque sauvegarde
// Pas de parametre "next" ici : Mongoose n'attend alors pas de callback
// et enchaine automatiquement apres l'execution synchrone de la fonction.
WheelSettingsSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

const WheelSettings = mongoose.model('WheelSettings', WheelSettingsSchema);

// Initialiser les settings si inexistants
const initializeWheelSettings = async () => {
  const count = await WheelSettings.countDocuments();
  if (count === 0) {
    const defaultSettings = new WheelSettings({
      isActive: true,
      title: "🎡 Tentez votre chance",
      subtitle: "Gagnez des plats offerts !",
      buttonText: "Jouer"
    });
    await defaultSettings.save();
    console.log('✅ Wheel settings initialized');
  }
};

module.exports = WheelSettings;
module.exports.initializeWheelSettings = initializeWheelSettings;