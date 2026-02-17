const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner'); // Assure-toi d'avoir créé le modèle Banner.js

// @route   GET /api/banner
// @desc    Récupérer les 4 images du slider
router.get('/', async (req, res) => {
    try {
        const banner = await Banner.findOne({ name: "MainSlider" });
        if (!banner) {
            // Si aucune bannière n'existe encore, on renvoie un tableau vide
            return res.json({ images: [] });
        }
        res.json({ images: banner.images });
    } catch (err) {
        console.error("Erreur GET Banner:", err);
        res.status(500).json({ message: "Erreur lors de la récupération de la bannière" });
    }
});

// @route   POST /api/banner/update
// @desc    Mettre à jour les 4 images (Admin)
router.post('/update', async (req, res) => {
    try {
        const { images } = req.body; 

        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ message: "Un tableau d'images est requis" });
        }

        // On cherche "MainSlider", si il n'existe pas, on le crée (upsert: true)
        const updatedBanner = await Banner.findOneAndUpdate(
            { name: "MainSlider" },
            { 
                images: images, 
                updatedAt: Date.now() 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
            message: "Bannière mise à jour avec succès",
            images: updatedBanner.images
        });
    } catch (err) {
        console.error("Erreur POST Banner:", err);
        res.status(400).json({ message: "Erreur lors de la mise à jour" });
    }
});

module.exports = router;