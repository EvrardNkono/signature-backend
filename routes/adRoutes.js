// routes/popupRoutes.js
const express = require('express');
const router = express.Router();
const Popup = require('../models/Popup'); // Nouveau modèle

// ==================== ADMIN (CRUD complet) ====================

// Récupérer TOUTES les popups (pour l'admin)
router.get('/admin', async (req, res) => {
  try {
    const popups = await Popup.find().sort({ order: 1 });
    res.json({ success: true, data: popups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Récupérer les popups ACTIVES uniquement (pour le site public)
router.get('/active', async (req, res) => {
  try {
    const popups = await Popup.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: popups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Créer une nouvelle popup
router.post('/', async (req, res) => {
  try {
    const { order, isActive } = req.body;
    
    // Vérifier si l'ordre existe déjà
    const existingOrder = await Popup.findOne({ order });
    if (existingOrder) {
      return res.status(400).json({ 
        success: false, 
        message: `Une popup existe déjà à la position ${order}` 
      });
    }
    
    // Vérifier la limite de 4 popups actives
    if (isActive !== false) {
      const activeCount = await Popup.countDocuments({ isActive: true });
      if (activeCount >= 4) {
        return res.status(400).json({ 
          success: false, 
          message: "Vous ne pouvez pas avoir plus de 4 popups actives simultanément" 
        });
      }
    }
    
    const popup = new Popup(req.body);
    await popup.save();
    res.status(201).json({ success: true, data: popup });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Mettre à jour une popup
router.put('/:id', async (req, res) => {
  try {
    const { order, isActive } = req.body;
    const popup = await Popup.findById(req.params.id);
    
    if (!popup) {
      return res.status(404).json({ success: false, message: "Popup non trouvée" });
    }
    
    // Si on change l'ordre, vérifier qu'il n'est pas déjà pris
    if (order && order !== popup.order) {
      const existingOrder = await Popup.findOne({ order, _id: { $ne: req.params.id } });
      if (existingOrder) {
        return res.status(400).json({ 
          success: false, 
          message: `Une popup existe déjà à la position ${order}` 
        });
      }
    }
    
    // Si on active une popup, vérifier la limite de 4
    if (isActive === true && !popup.isActive) {
      const activeCount = await Popup.countDocuments({ isActive: true });
      if (activeCount >= 4) {
        return res.status(400).json({ 
          success: false, 
          message: "Vous ne pouvez pas activer plus de 4 popups" 
        });
      }
    }
    
    Object.assign(popup, req.body);
    popup.updatedAt = Date.now();
    await popup.save();
    res.json({ success: true, data: popup });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Supprimer une popup
router.delete('/:id', async (req, res) => {
  try {
    const popup = await Popup.findByIdAndDelete(req.params.id);
    if (!popup) {
      return res.status(404).json({ success: false, message: "Popup non trouvée" });
    }
    res.json({ success: true, message: "Popup supprimée" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== COMPATIBILITÉ ANCIENNE API ====================
// Pour garder la compatibilité avec votre ancien système (une seule popup)

// Récupérer la configuration principale (la première popup active)
router.get('/', async (req, res) => {
  try {
    const mainPopup = await Popup.findOne({ isActive: true }).sort({ order: 1 });
    if (mainPopup) {
      res.json({
        title: mainPopup.title,
        description: mainPopup.description,
        image: mainPopup.image,
        isActive: mainPopup.isActive,
        duration: mainPopup.duration
      });
    } else {
      res.json({ title: "", description: "", isActive: false, image: "" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mettre à jour la configuration principale (ancienne méthode)
router.post('/update', async (req, res) => {
  try {
    const { title, description, image, isActive } = req.body;
    
    // Chercher la première popup active ou en créer une
    let mainPopup = await Popup.findOne({ order: 1 });
    
    if (mainPopup) {
      mainPopup.title = title;
      mainPopup.description = description;
      mainPopup.image = image;
      mainPopup.isActive = isActive !== undefined ? isActive : mainPopup.isActive;
      mainPopup.updatedAt = Date.now();
      await mainPopup.save();
    } else {
      mainPopup = new Popup({
        title,
        description,
        image,
        isActive: isActive !== undefined ? isActive : true,
        order: 1,
        duration: 5
      });
      await mainPopup.save();
    }
    
    res.json(mainPopup);
  } catch (err) {
    res.status(400).json({ message: "Impossible de mettre à jour la publicité" });
  }
});

module.exports = router;