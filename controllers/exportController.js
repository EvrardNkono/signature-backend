// controllers/exportController.js - Version sans ZIP
const Menu = require('../models/Menu');
const Category = require('../models/Category');

async function getImagesList(req, res) {
  try {
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image category');
    
    res.json({
      success: true,
      count: plats.length,
      images: plats.map(plat => ({
        name: plat.name,
        url: plat.image,
        category: plat.category
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function exportPlatsData(req, res) {
  try {
    const plats = await Menu.find({}).populate('category', 'name univers').lean();
    
    let csvContent = "Nom,Description,Prix,Catégorie,Univers\n";
    for (const plat of plats) {
      csvContent += `"${plat.name}","${plat.description || ''}",${plat.price},"${plat.category?.name || ''}","${plat.category?.univers || ''}"\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=plats.csv');
    res.write('\uFEFF');
    res.end(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function exportPlatsJSON(req, res) {
  try {
    const plats = await Menu.find({}).populate('category', 'name univers').lean();
    res.json({ success: true, count: plats.length, data: plats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Stubs pour les autres fonctions
async function exportAllPlatImages(req, res) {
  res.json({ message: "Fonctionnalité ZIP désactivée sur Vercel. Utilisez /api/export/images/list pour lister les images." });
}

async function exportCategoryImages(req, res) {
  res.json({ message: "Fonctionnalité ZIP désactivée sur Vercel" });
}

async function exportComplete(req, res) {
  res.json({ message: "Fonctionnalité ZIP désactivée sur Vercel. Utilisez /api/export/plats-data pour CSV et /api/export/images/list pour les images." });
}

async function exportCompleteByCategory(req, res) {
  res.json({ message: "Fonctionnalité ZIP désactivée sur Vercel" });
}

module.exports = {
  exportAllPlatImages,
  exportCategoryImages,
  getImagesList,
  exportPlatsData,
  exportPlatsJSON,
  exportComplete,
  exportCompleteByCategory
};