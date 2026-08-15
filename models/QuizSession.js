const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  dateDebut: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dateFin: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual pour compter les questions
QuizSessionSchema.virtual('questionCount', {
  ref: 'QuizQuestion',
  localField: '_id',
  foreignField: 'sessionId',
  count: true,
});

module.exports = mongoose.model('QuizSession', QuizSessionSchema);