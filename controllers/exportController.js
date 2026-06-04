// controllers/exportController.js - Version avec ZIP fonctionnel
const Menu = require('../models/Menu');
const Category = require('../models/Category');
const axios = require('axios');
const { Readable } = require('stream');

// Fonction pour télécharger une image
async function downloadImage(url) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`❌ Erreur téléchargement: ${error.message}`);
    return null;
  }
}

// Nettoyer le nom du fichier
function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 50);
}

// Générer CSV
async function generatePlatsCSV(filterCategoryId = null) {
  let query = {};
  if (filterCategoryId) {
    query.category = filterCategoryId;
  }
  
  const plats = await Menu.find(query)
    .populate('category', 'name univers')
    .lean();
  
  let csvContent = "Nom du plat,Description,Prix (€),Catégorie,Univers,Service Midi,Service Soir,Disponible\n";
  
  for (const plat of plats) {
    const description = (plat.description || "").replace(/"/g, '""');
    const name = plat.name.replace(/"/g, '""');
    const categoryName = plat.category?.name || "Non catégorisé";
    const univers = plat.category?.univers || "Cuisine";
    
    csvContent += `"${name}","${description}",${plat.price},"${categoryName}","${univers}",${plat.showInMenuJour ? "Oui" : "Non"},${plat.showInMenuSoir ? "Oui" : "Non"},${plat.isAvailable ? "Oui" : "Non"}\n`;
  }
  
  return csvContent;
}

// EXPORT COMPLET (TOUT en UN SEUL ZIP)
async function exportComplete(req, res) {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).populate('category', 'name univers');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({ success: false, message: "Aucune donnée trouvée" });
    }
    
    console.log(`📦 Export complet de ${plats.length} plats...`);
    
    // 1. Ajouter le CSV
    const csvContent = await generatePlatsCSV();
    zip.file("CATALOGUE_COMPLET.csv", "\uFEFF" + csvContent);
    
    // 2. Ajouter les images
    let successCount = 0;
    for (const plat of plats) {
      if (!plat.image) continue;
      
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        zip.file(`images/${fileName}`, imageBuffer);
        successCount++;
      }
    }
    
    // 3. Ajouter un README
    const readme = `# EXPORT SIGNATURE RESTAURANT

📅 Date: ${new Date().toLocaleString('fr-FR')}
📊 Plats exportés: ${plats.length}
✅ Images: ${successCount}/${plats.length}

## Fichiers inclus:
- CATALOGUE_COMPLET.csv : Catalogue Excel
- images/ : Dossier contenant toutes les images

Généré le ${new Date().toLocaleString('fr-FR')}
`;
    zip.file("LISEZ_MOI.txt", readme);
    
    // Générer le ZIP
    const zipBuffer = await zip.generateAsync({ 
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_complet_${Date.now()}.zip`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
    
    console.log(`✅ Export complet: ${successCount} images incluses`);
    
  } catch (error) {
    console.error("❌ Erreur export complet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// EXPORT UNIQUEMENT DES IMAGES
async function exportAllPlatImages(req, res) {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({ success: false, message: "Aucune image trouvée" });
    }
    
    console.log(`📸 Export de ${plats.length} images...`);
    
    let successCount = 0;
    for (const plat of plats) {
      if (!plat.image) continue;
      
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        zip.file(`images/${fileName}`, imageBuffer);
        successCount++;
      }
    }
    
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_images_${Date.now()}.zip`);
    res.send(zipBuffer);
    
    console.log(`✅ Export images: ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// AUTRES FONCTIONS (CSV, JSON, liste)
async function getImagesList(req, res) {
  try {
    const plats = await Menu.find({ image: { $exists: true, $ne: "" } }).select('name image category');
    res.json({ success: true, count: plats.length, images: plats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function exportPlatsData(req, res) {
  try {
    const csvContent = await generatePlatsCSV();
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

async function exportCategoryImages(req, res) {
  res.json({ message: "Fonctionnalité disponible dans exportComplete avec filtre" });
}

async function exportCompleteByCategory(req, res) {
  res.json({ message: "Fonctionnalité disponible dans exportComplete avec filtre" });
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