const Supplement = require('../models/Supplement');

// @desc    Créer un supplément (Bibliothèque globale)
// @route   POST /api/supplements
exports.createSupplement = async (req, res) => {
  try {
    // Création simple sans besoin de populate category
    const supplement = await Supplement.create(req.body);
    
    res.status(201).json({ success: true, data: supplement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer tous les suppléments
// @route   GET /api/supplements
exports.getSupplements = async (req, res) => {
  try {
    const isPublic = req.query.public === 'true';
    let filter = {};
    
    if (isPublic) {
      filter.active = true;
    }

    // On retire le .populate('category') qui ferait planter la requête
    const supplements = await Supplement.find(filter)
      .sort({ name: 1 });

    res.status(200).json({ 
      success: true, 
      count: supplements.length, 
      data: supplements 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Modifier un supplément
// @route   PUT /api/supplements/:id
exports.updateSupplement = async (req, res) => {
  try {
    const supplement = await Supplement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }); // Plus de populate ici non plus

    if (!supplement) {
      return res.status(404).json({ success: false, error: "Supplément non trouvé" });
    }

    res.status(200).json({ success: true, data: supplement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Supprimer un supplément
// @route   DELETE /api/supplements/:id
exports.deleteSupplement = async (req, res) => {
  try {
    const supplement = await Supplement.findByIdAndDelete(req.params.id);

    if (!supplement) {
      return res.status(404).json({ success: false, error: "Supplément non trouvé" });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};