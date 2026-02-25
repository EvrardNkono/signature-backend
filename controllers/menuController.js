const Menu = require('../models/Menu');

// @desc    Ajouter un nouveau plat
// @route   POST /api/menu
exports.createMenuItem = async (req, res) => {
  try {
    // 1. Création
    const newItem = await Menu.create(req.body);
    
    // 2. Population (Correction syntaxe pour Mongoose 6/7/8)
    const populatedItem = await Menu.findById(newItem._id)
      .populate(['category', 'accompaniments', 'supplements']);
    
    res.status(201).json({ success: true, data: populatedItem });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer tout le menu
// @route   GET /api/menu
exports.getMenu = async (req, res) => {
  try {
    const isPublicRequest = req.query.public === 'true';
    
    let query = Menu.find().populate(['category', 'accompaniments', 'supplements']);

    const menu = await query.sort({ name: 1 });

    let finalData = menu;
    if (isPublicRequest) {
      // Filtre : Catégorie active + on pourrait ajouter item visible ?
      finalData = menu.filter(item => item.category && item.category.active === true);
    }

    res.status(200).json({ 
      success: true, 
      count: finalData.length, 
      data: finalData 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Modifier un plat existant
// @route   PUT /api/menu/:id
exports.updateMenuItem = async (req, res) => {
  try {
    // { new: true } renvoie l'objet après modification
    const item = await Menu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate(['category', 'accompaniments', 'supplements']);

    if (!item) {
      return res.status(404).json({ success: false, error: "Plat non trouvé" });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Supprimer un plat
exports.deleteMenuItem = async (req, res) => {
  try {
    const item = await Menu.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Plat non trouvé" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};