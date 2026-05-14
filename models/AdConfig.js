// models/Popup.js
const mongoose = require('mongoose');

const PopupSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, "Le titre est obligatoire"] 
  },
  description: { 
    type: String, 
    required: [true, "La description est obligatoire"] 
  },
  image: { 
    type: String, 
    required: [true, "L'image est obligatoire"] 
  },
  link: { 
    type: String, 
    default: "#" 
  },
  duration: { 
    type: Number, 
    required: [true, "La durée d'affichage est obligatoire"],
    min: 2,
    max: 30,
    default: 5,
    description: "Durée d'affichage en secondes"
  },
  order: { 
    type: Number, 
    required: true,
    min: 1,
    max: 4,
    unique: true,
    description: "Position dans la séquence (1 à 4)"
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  backgroundColor: {
    type: String,
    default: "#2D2422"
  },
  textColor: {
    type: String,
    default: "#D4AF37"
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

// Middleware pour mettre à jour updatedAt
PopupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Vérifier qu'on ne dépasse pas 4 popups actives
PopupSchema.statics.canAddPopup = async function() {
  const count = await this.countDocuments({ isActive: true });
  return count < 4;
};

module.exports = mongoose.model('Popup', PopupSchema);