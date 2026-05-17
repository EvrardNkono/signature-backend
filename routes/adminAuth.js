const express = require('express');
const router = express.Router();
const AdminConfig = require('../models/AdminConfig');
const connectDB = require('../config/db');

// Vérifier le mot de passe
router.post('/check-password', async (req, res) => {
  await connectDB();
  const { password } = req.body;

  const config = await AdminConfig.findOne();
  if (!config) {
    return res.status(404).json({ success: false, message: 'Aucun mot de passe configuré' });
  }

  if (password === config.password) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
});

// Initialiser le mot de passe (à appeler une seule fois)
router.post('/init-password', async (req, res) => {
  await connectDB();
  const { password } = req.body;

  const existing = await AdminConfig.findOne();
  if (existing) {
    existing.password = password;
    await existing.save();
    return res.json({ success: true, message: 'Mot de passe mis à jour' });
  }

  await AdminConfig.create({ password });
  res.json({ success: true, message: 'Mot de passe créé' });
});

module.exports = router;