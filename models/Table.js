const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: {
    type: String, // String pour accepter "Table 1" ou "T1" ou "Terrasse"
    required: true,
    unique: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true // Permet de désactiver une table si elle est cassée ou retirée
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);