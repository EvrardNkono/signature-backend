import express from 'express';
import {
  getWheelSettings,
  updateWheelSettings,
  toggleWheelGame,
  getWheelStats
} from '../controllers/wheelController.js';

const router = express.Router();

// Routes publiques (pour le frontend)
router.get('/settings', getWheelSettings);

// Routes admin (protégées par middleware d'authentification)
router.put('/settings', updateWheelSettings);
router.patch('/toggle', toggleWheelGame);
router.get('/stats', getWheelStats);

export default router;