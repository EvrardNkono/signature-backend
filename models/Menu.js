const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom du plat est obligatoire"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "La description est obligatoire"]
  },
  price: {
    type: Number, 
    required: [true, "Le prix est obligatoire"]
  },
  category: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: [true, "La catégorie est obligatoire"]
  },

  // --- NOUVEAU : GESTION DES OFFRES (EX: 3 BIÈRES POUR 5€) ---
  offer: {
    enabled: { 
      type: Boolean, 
      default: false 
    },
    requiredQuantity: { 
      type: Number, 
      default: 0 
    },
    offerPrice: { 
      type: Number, 
      default: 0 
    }
  },
  
  // --- GESTION DES ACCOMPAGNEMENTS ---
  hasAccompaniment: { 
    type: Boolean, 
    default: false 
  },
  // ... (le reste de ton code ne change pas)
  accompaniments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Accompaniment'
  }],

  allowSupplements: {
    type: Boolean,
    default: false
  },
  supplements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplement'
  }],

  subCategory: {
    type: String,
    default: "",
    trim: true
  },
  image: {
    type: String, 
    required: false
  },
  showInCarte: { type: Boolean, default: true },
  showInMenuJour: { type: Boolean, default: false },
  showInMenuSoir: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  isChefSpecial: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

MenuSchema.index({ category: 1, subCategory: 1 });

module.exports = mongoose.model('Menu', MenuSchema);