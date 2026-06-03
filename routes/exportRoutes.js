// routes/exportRoutes.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// ==================== EXPORT DES IMAGES ====================

// Route pour exporter TOUTES les images des plats (ZIP)
router.get('/export/images/all', exportController.exportAllPlatImages);

// Route pour exporter les images d'une catégorie spécifique
router.get('/export/images/category/:categoryId', exportController.exportCategoryImages);

// Route pour obtenir la liste des images disponibles (sans téléchargement)
router.get('/images/list', exportController.getImagesList);

// ==================== EXPORT DES DONNÉES (CSV/EXCEL) ====================

// Route pour exporter les données des plats au format CSV (pour Excel)
router.get('/export/plats-data', exportController.exportPlatsData);

// Route pour exporter les données des plats au format JSON
router.get('/export/plats-json', exportController.exportPlatsJSON);

// ==================== EXPORT COMPLET (IMAGES + CSV) ====================

// Route pour exporter TOUT (images + données CSV) en un seul ZIP
router.get('/export/complete', exportController.exportComplete);

// Route pour exporter les données d'une catégorie spécifique (images + CSV filtré)
router.get('/export/complete/category/:categoryId', exportController.exportCompleteByCategory);

module.exports = router;