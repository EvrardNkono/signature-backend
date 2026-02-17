const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  name: { type: String, default: "MainSlider" },
  images: [{
    type: String, // Stockera l'URL ou le Base64 compressé
    required: true
  }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', BannerSchema);