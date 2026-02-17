const express = require('express');
const router = express.Router();
const AdConfig = require('../models/AdConfig'); // Import mis à jour

// Récupérer la configuration
router.get('/', async (req, res) => {
  try {
    const ad = await AdConfig.findOne({ name: "MainPopup" });
    res.json(ad || { title: "", description: "", isActive: false, image: "" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mettre à jour la configuration
router.post('/update', async (req, res) => {
  try {
    const { title, description, image, isActive } = req.body;
    const updatedAd = await AdConfig.findOneAndUpdate(
      { name: "MainPopup" },
      { title, description, image, isActive, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    res.json(updatedAd);
  } catch (err) {
    res.status(400).json({ message: "Impossible de mettre à jour la publicité" });
  }
});

module.exports = router;