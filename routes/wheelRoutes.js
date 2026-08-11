const express = require('express');
const {
  getWheelSettings,
  updateWheelSettings,
  toggleWheelGame,
  getWheelStats
} = require('../controllers/wheelController');

const router = express.Router();

// Routes publiques (pour le frontend)
router.get('/settings', getWheelSettings);

// Routes admin (protégées par middleware d'authentification)
router.put('/settings', updateWheelSettings);
router.patch('/toggle', toggleWheelGame);
router.get('/stats', getWheelStats);

module.exports = router;