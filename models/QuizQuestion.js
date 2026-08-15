const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizSession',
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true,
  },
  reponseA: {
    type: String,
    required: true,
    trim: true,
  },
  reponseB: {
    type: String,
    required: true,
    trim: true,
  },
  reponseC: {
    type: String,
    required: true,
    trim: true,
  },
  reponseD: {
    type: String,
    required: true,
    trim: true,
  },
  bonneReponse: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  ordre: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index pour récupérer les questions par session dans l'ordre
QuizQuestionSchema.index({ sessionId: 1, ordre: 1 });

module.exports = mongoose.model('QuizQuestion', QuizQuestionSchema);