const Category = require('../models/Category');

// @desc    Créer une nouvelle catégorie
// @route   POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer toutes les catégories (Admin)
// @route   GET /api/categories
exports.getAllCategories = async (req, res) => {
  try {
    // On trie pour que l'admin voit les groupes (Table puis Cave)
    const categories = await Category.find().sort({ univers: 1, name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Mettre à jour une catégorie (Visibilité, Nom, Univers)
// @route   PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Retourne le document modifié
        runValidators: true, // Vérifie que l'univers est bien 'Cuisine' ou 'Boissons'
      }
    );

    if (!category) {
      return res.status(404).json({ success: false, error: "Catégorie non trouvée" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer les catégories d'un univers spécifique (Filtrage Front-end)
// @route   GET /api/categories/univers/:type
exports.getCategoriesByUnivers = async (req, res) => {
  try {
    // Pour le site client, on ne récupère QUE les catégories actives
    const categories = await Category.find({ 
      univers: req.params.type,
      active: true 
    }).sort({ name: 1 });
    
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Supprimer une catégorie
// @route   DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: "Catégorie non trouvée" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};