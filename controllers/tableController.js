const Table = require('../models/Table');

// @desc    Obtenir toutes les tables
// @route   GET /api/tables
exports.getTables = async (req, res) => {
    try {
        // On peut filtrer par ?active=true si on veut uniquement les tables utilisables
        const filter = req.query.active === 'true' ? { active: true } : {};
        const tables = await Table.find(filter).sort({ number: 1 });
        
        res.status(200).json({ success: true, count: tables.length, data: tables });
    } catch (error) {
        res.status(500).json({ success: false, error: "Erreur lors de la récupération des tables" });
    }
};

// @desc    Créer une nouvelle table
// @route   POST /api/tables
exports.createTable = async (req, res) => {
    try {
        const table = await Table.create(req.body);
        res.status(201).json({ success: true, data: table });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Ce numéro de table existe déjà" });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Supprimer une table
// @route   DELETE /api/tables/:id
exports.deleteTable = async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (!table) return res.status(404).json({ success: false, error: "Table non trouvée" });
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};