const Menu = require('../models/Menu');

// @desc    Ajouter un nouveau plat
// @route   POST /api/menu
exports.createMenuItem = async (req, res) => {
  try {
    const newItem = await Menu.create(req.body);
    
    // Ajout de 'supplements' à la liste de population
    const populatedItem = await newItem.populate(['category', 'accompaniments', 'supplements']);
    
    res.status(201).json({ success: true, data: populatedItem });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer tout le menu (avec filtre intelligent pour le front)
// @route   GET /api/menu
exports.getMenu = async (req, res) => {
  try {
    const isPublicRequest = req.query.public === 'true';
    
    // Ajout de 'supplements' ici pour que le menu client les affiche
    let query = Menu.find().populate(['category', 'accompaniments', 'supplements']);

    const menu = await query.sort({ name: 1 });

    let finalData = menu;
    if (isPublicRequest) {
      // On ne garde que les items dont la catégorie est active
      finalData = menu.filter(item => item.category && item.category.active === true);
    }

    res.status(200).json({ 
      success: true, 
      count: finalData.length, 
      data: finalData 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération" });
  }
};

// @desc    Modifier un plat existant
// @route   PUT /api/menu/:id
exports.updateMenuItem = async (req, res) => {
  try {
    // Mise à jour avec renvoi de l'objet totalement peuplé (cat, acc, supps)
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
// @route   DELETE /api/menu/:id
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