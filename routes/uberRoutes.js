const express = require('express');
const router = express.Router();
// Vérifie bien le chemin (./ ou ../)
const uberController = require('../controllers/uberController');

// TEST DE DÉBOGAGE : Ajoute cette ligne juste ici
console.log('Vérification du contrôleur :', uberController);

// Si uberController est vide ou undefined, Express plante sur la ligne suivante
router.post('/estimate', uberController.getDeliveryEstimate);

module.exports = router;