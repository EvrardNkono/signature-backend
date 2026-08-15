const mongoose = require('mongoose');

const QuizLotSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  probabilite: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  typeLot: {
    type: String,
    enum: ['code_genere', 'code_fixe', 'sans_code'],
    default: 'code_genere',
  },
  codePromo: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
  },
  actif: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('QuizLot', QuizLotSchema);