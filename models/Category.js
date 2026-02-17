const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom de la catégorie est obligatoire"],
    unique: true, 
    trim: true
  },
  univers: {
    type: String,
    enum: ['Cuisine', 'Boissons'],
    required: [true, "L'univers est obligatoire (Cuisine ou Boissons)"]
  },
  // --- AJOUTE CES LIGNES ---
  active: {
    type: Boolean,
    default: true // Par défaut, une nouvelle catégorie est visible
  },
  // -------------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Category', CategorySchema);