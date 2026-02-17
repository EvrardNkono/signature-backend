const express = require('express');
const router = express.Router();
const { 
  createMenuItem, 
  getMenu, 
  updateMenuItem, 
  deleteMenuItem 
} = require('../controllers/menuController');

/**
 * ROUTES POUR LE MENU
 * Note : Le contrôleur utilise désormais .populate('category') 
 * pour transformer l'ID en objet catégorie complet lors des GET.
 */

// Routes pour /api/menu (Récupération globale et Création)
router.route('/')
  .get(getMenu)         // Récupère tous les plats (avec détails des catégories)
  .post(createMenuItem); // Crée un plat en liant l'ID d'une catégorie existante

// Routes pour /api/menu/:id (Actions spécifiques sur un plat)
router.route('/:id')
  .put(updateMenuItem)    // Met à jour les infos ou change la catégorie
  .delete(deleteMenuItem); // Supprime le plat

module.exports = router;