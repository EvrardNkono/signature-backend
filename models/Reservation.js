// models/Reservation.js
const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  date:   { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },   // YYYY-MM-DD (heure de Paris)
  time:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },         // HH:mm
  guests: { type: Number, required: true, min: 1, max: 20 },
  name:   { type: String, required: true, trim: true, maxlength: 80 },
  phone:  { type: String, required: true, trim: true, maxlength: 25 },
  email:  { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
  notes:  { type: String, default: '', trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
  handledAt: { type: Date, default: null }
}, { timestamps: true });

ReservationSchema.index({ date: 1, time: 1 });
ReservationSchema.index({ status: 1 });

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
