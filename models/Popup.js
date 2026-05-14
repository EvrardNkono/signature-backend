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
    default: 5,
    min: 2,
    max: 30
  },
  order: { 
    type: Number, 
    required: true,
    min: 1,
    max: 4
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

// ⚠️ PAS DE pre('save') - il cause l'erreur "next is not a function"

module.exports = mongoose.model('Popup', PopupSchema);