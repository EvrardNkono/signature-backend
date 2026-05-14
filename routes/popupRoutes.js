// routes/popupRoutes.js
const express = require('express');
const router = express.Router();
const Popup = require('../models/Popup');

// ==================== ADMIN (CRUD complet) ====================

// Récupérer TOUTES les popups (pour l'admin)
router.get('/admin', async (req, res) => {
  try {
    const popups = await Popup.find().sort({ order: 1 });
    res.json({ success: true, data: popups });
  } catch (err) {
    console.error("Erreur GET /admin:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Récupérer les popups ACTIVES uniquement (pour le site public)
router.get('/active', async (req, res) => {
  try {
    const popups = await Popup.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: popups });
  } catch (err) {
    console.error("Erreur GET /active:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Créer une nouvelle popup
router.post('/', async (req, res) => {
  console.log("📥 [POST] Données reçues:", JSON.stringify(req.body, null, 2));
  
  try {
    const { order, isActive, title, description, image, link, duration, backgroundColor, textColor } = req.body;
    
    // Validation des champs requis
    const errors = [];
    if (!title) errors.push("Le titre est obligatoire");
    if (!description) errors.push("La description est obligatoire");
    if (!image) errors.push("L'image est obligatoire");
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: errors.join(", ")
      });
    }
    
    // Vérifier si l'ordre existe déjà
    const orderValue = order || 1;
    const existingOrder = await Popup.findOne({ order: orderValue });
    if (existingOrder) {
      return res.status(400).json({ 
        success: false, 
        message: `Une popup existe déjà à la position ${orderValue}` 
      });
    }
    
    // Vérifier la limite de 4 popups actives
    const isActiveValue = isActive !== undefined ? isActive : true;
    if (isActiveValue) {
      const activeCount = await Popup.countDocuments({ isActive: true });
      if (activeCount >= 4) {
        return res.status(400).json({ 
          success: false, 
          message: "Vous ne pouvez pas avoir plus de 4 popups actives simultanément" 
        });
      }
    }
    
    // Création de la popup
    const now = Date.now();
    const popupData = {
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      link: link && link !== "#" ? link.trim() : "#",
      duration: duration && duration >= 2 && duration <= 30 ? duration : 5,
      order: orderValue,
      isActive: isActiveValue,
      backgroundColor: backgroundColor || "#2D2422",
      textColor: textColor || "#D4AF37",
      createdAt: now,
      updatedAt: now
    };
    
    const popup = new Popup(popupData);
    await popup.save();
    
    console.log("✅ [POST] Popup créée avec succès:", popup._id);
    res.status(201).json({ success: true, data: popup });
    
  } catch (err) {
    console.error("❌ [POST] Erreur création popup:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Mettre à jour une popup
router.put('/:id', async (req, res) => {
  console.log("📥 [PUT] Données reçues pour ID:", req.params.id);
  
  try {
    const { order, isActive, title, description, image, link, duration, backgroundColor, textColor } = req.body;
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
      popup.order = order;
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
      popup.isActive = true;
    } else if (isActive === false) {
      popup.isActive = false;
    }
    
    // Mise à jour des champs
    if (title) popup.title = title.trim();
    if (description) popup.description = description.trim();
    if (image) popup.image = image.trim();
    if (link !== undefined) popup.link = link && link !== "#" ? link.trim() : "#";
    if (duration && duration >= 2 && duration <= 30) popup.duration = duration;
    if (backgroundColor) popup.backgroundColor = backgroundColor;
    if (textColor) popup.textColor = textColor;
    
    popup.updatedAt = Date.now();
    await popup.save();
    
    console.log("✅ [PUT] Popup mise à jour:", popup._id);
    res.json({ success: true, data: popup });
    
  } catch (err) {
    console.error("❌ [PUT] Erreur mise à jour:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Supprimer une popup
router.delete('/:id', async (req, res) => {
  console.log("📥 [DELETE] Suppression ID:", req.params.id);
  
  try {
    const popup = await Popup.findByIdAndDelete(req.params.id);
    if (!popup) {
      return res.status(404).json({ success: false, message: "Popup non trouvée" });
    }
    
    console.log("✅ [DELETE] Popup supprimée:", popup._id);
    res.json({ success: true, message: "Popup supprimée" });
    
  } catch (err) {
    console.error("❌ [DELETE] Erreur suppression:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== COMPATIBILITÉ ANCIENNE API ====================

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
        duration: mainPopup.duration,
        link: mainPopup.link,
        backgroundColor: mainPopup.backgroundColor,
        textColor: mainPopup.textColor
      });
    } else {
      res.json({ 
        title: "Offre Spéciale", 
        description: "Découvrez nos délices", 
        isActive: false, 
        image: "",
        duration: 5,
        link: "#",
        backgroundColor: "#2D2422",
        textColor: "#D4AF37"
      });
    }
  } catch (err) {
    console.error("Erreur GET /:", err);
    res.status(500).json({ message: err.message });
  }
});

// Mettre à jour la configuration principale (ancienne méthode)
router.post('/update', async (req, res) => {
  console.log("📥 [POST /update] Données reçues:", req.body);
  
  try {
    const { title, description, image, isActive, link, duration, backgroundColor, textColor } = req.body;
    
    let mainPopup = await Popup.findOne({ order: 1 });
    
    if (mainPopup) {
      if (title) mainPopup.title = title;
      if (description) mainPopup.description = description;
      if (image) mainPopup.image = image;
      if (isActive !== undefined) mainPopup.isActive = isActive;
      if (link) mainPopup.link = link;
      if (duration) mainPopup.duration = duration;
      if (backgroundColor) mainPopup.backgroundColor = backgroundColor;
      if (textColor) mainPopup.textColor = textColor;
      mainPopup.updatedAt = Date.now();
      await mainPopup.save();
    } else {
      mainPopup = new Popup({
        title: title || "Offre Spéciale",
        description: description || "Découvrez nos délices",
        image: image || "",
        isActive: isActive !== undefined ? isActive : true,
        order: 1,
        duration: duration || 5,
        link: link || "#",
        backgroundColor: backgroundColor || "#2D2422",
        textColor: textColor || "#D4AF37",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await mainPopup.save();
    }
    
    console.log("✅ [POST /update] Configuration mise à jour");
    res.json(mainPopup);
    
  } catch (err) {
    console.error("❌ [POST /update] Erreur:", err);
    res.status(400).json({ message: "Impossible de mettre à jour la publicité" });
  }
});

module.exports = router;