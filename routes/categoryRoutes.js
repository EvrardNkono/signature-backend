const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  updateCategory, // Assure-toi de l'importer depuis le controller
  deleteCategory,
  getCategoriesByUnivers 
} = require('../controllers/categoryController');

/**
 * ROUTES POUR LES CATÉGORIES
 * URL de base : /api/categories
 */

// 1. Routes pour la racine : /api/categories
router.route('/')
  .get(getAllCategories)  // Récupère et trie les catégories
  .post(createCategory);  // Crée une catégorie (Nom + Univers + Active)

// 2. Routes par ID : /api/categories/:id
router.route('/:id')
  .put(updateCategory)    // <--- AJOUTÉ : Permet de modifier 'active', 'name' ou 'univers'
  .delete(deleteCategory); // Supprime la catégorie

// 3. Route pour filtrer par univers : /api/categories/univers/:type
if (getCategoriesByUnivers) {
    router.get('/univers/:type', getCategoriesByUnivers);
}

module.exports = router;