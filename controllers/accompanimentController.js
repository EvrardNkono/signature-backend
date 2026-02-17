const Accompaniment = require('../models/Accompaniment');

// Récupérer tout
exports.getAll = async (req, res) => {
  try {
    const items = await Accompaniment.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Créer
exports.create = async (req, res) => {
  try {
    const item = await Accompaniment.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Modifier (pour activer/désactiver)
exports.update = async (req, res) => {
  try {
    const item = await Accompaniment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Supprimer
exports.delete = async (req, res) => {
  try {
    await Accompaniment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};