// routes/exportRoutes.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// ==================== EXPORT DES IMAGES ====================

// Route pour exporter TOUTES les images des plats (ZIP)
// Chemin final: /api/export/images/all
router.get('/images/all', exportController.exportAllPlatImages);

// Route pour exporter les images d'une catégorie spécifique
// Chemin final: /api/export/images/category/:categoryId
router.get('/images/category/:categoryId', exportController.exportCategoryImages);

// Route pour obtenir la liste des images disponibles (sans téléchargement)
// Chemin final: /api/export/images/list
router.get('/images/list', exportController.getImagesList);

// ==================== EXPORT DES DONNÉES (CSV/EXCEL) ====================

// Route pour exporter les données des plats au format CSV (pour Excel)
// Chemin final: /api/export/plats-data
router.get('/plats-data', exportController.exportPlatsData);

// Route pour exporter les données des plats au format JSON
// Chemin final: /api/export/plats-json
router.get('/plats-json', exportController.exportPlatsJSON);

// ==================== EXPORT COMPLET (IMAGES + CSV) ====================

// Route pour exporter TOUT (images + données CSV) en un seul ZIP
// Chemin final: /api/export/complete
router.get('/complete', exportController.exportComplete);

// Route pour exporter les données d'une catégorie spécifique (images + CSV filtré)
// Chemin final: /api/export/complete/category/:categoryId
router.get('/complete/category/:categoryId', exportController.exportCompleteByCategory);

module.exports = router;