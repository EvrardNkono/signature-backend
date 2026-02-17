const mongoose = require('mongoose');

const SupplementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom du supplément est obligatoire"],
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Le prix est obligatoire"],
    min: [0, "Le prix ne peut pas être négatif"],
    default: 0
  },
  // Le champ category a été supprimé car le supplément est 
  // assigné manuellement au plat (Menu) lors de sa création.
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour accélérer la recherche par nom dans l'admin
SupplementSchema.index({ name: 'text' });

module.exports = mongoose.model('Supplement', SupplementSchema);