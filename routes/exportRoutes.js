// routes/exportRoutes.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// Route pour exporter TOUTES les images des plats (ZIP)
router.get('/export/images/all', exportController.exportAllPlatImages);

// Route pour exporter les images d'une catégorie spécifique
router.get('/export/images/category/:categoryId', exportController.exportCategoryImages);

// Route pour obtenir la liste des images disponibles (sans téléchargement)
router.get('/images/list', exportController.getImagesList);

module.exports = router;