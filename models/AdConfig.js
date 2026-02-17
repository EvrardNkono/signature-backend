const mongoose = require('mongoose');

const AdConfigSchema = new mongoose.Schema({
  name: { 
    type: String, 
    default: "MainPopup",
    unique: true // Garantit qu'on ne gère qu'une seule config de pub
  },
  title: { 
    type: String, 
    required: [true, "Le titre de la publicité est obligatoire"] 
  },
  description: { 
    type: String, 
    required: [true, "La description est obligatoire"] 
  },
  image: { 
    type: String, 
    required: [true, "Une image est nécessaire pour la popup"] 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('AdConfig', AdConfigSchema);