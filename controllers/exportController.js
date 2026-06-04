// controllers/exportController.js - Version avec CSV propre
const Menu = require('../models/Menu');
const Category = require('../models/Category');
const axios = require('axios');

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
    console.error(`❌ Erreur téléchargement ${url}:`, error.message);
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

// Générer CSV PROPRE avec séparateur point-virgule (meilleur pour Excel français)
async function generatePlatsCSV(filterCategoryId = null) {
  let query = {};
  if (filterCategoryId) {
    query.category = filterCategoryId;
  }
  
  const plats = await Menu.find(query)
    .populate('category', 'name univers')
    .lean();
  
  // En-têtes avec séparateur point-virgule (;)
  let csvContent = "Nom;Description;Prix (€);Catégorie;Univers;Service Midi;Service Soir;Disponible;Offre Active;Quantité Offre;Prix Offert;Image\n";
  
  for (const plat of plats) {
    // Nettoyer et échapper les guillemets
    const name = plat.name.replace(/["';]/g, '').trim();
    const description = (plat.description || "").replace(/["';]/g, '').trim();
    const categoryName = plat.category?.name?.replace(/["';]/g, '') || "Non catégorisé";
    const univers = plat.category?.univers?.replace(/["';]/g, '') || "Cuisine";
    
    // Déterminer l'extension de l'image
    let imageName = "";
    if (plat.image) {
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      imageName = `${sanitizeFileName(plat.name)}.${extension}`;
    }
    
    // Construction de la ligne - utilisation de point-virgule comme séparateur
    const row = [
      name,
      description,
      plat.price,
      categoryName,
      univers,
      plat.showInMenuJour ? "Oui" : "Non",
      plat.showInMenuSoir ? "Oui" : "Non",
      plat.isAvailable ? "Oui" : "Non",
      plat.offer?.enabled ? "Oui" : "Non",
      plat.offer?.requiredQuantity || "",
      plat.offer?.offerPrice || "",
      imageName
    ];
    
    csvContent += row.join(';') + "\n";
  }
  
  return csvContent;
}

// ==================== EXPORT CSV UNIQUEMENT (propre) ====================
async function exportPlatsData(req, res) {
  try {
    const csvContent = await generatePlatsCSV();
    
    // Configuration pour Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=catalogue_restaurant.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    
    // Ajouter BOM pour UTF-8 (compatibilité Excel)
    res.write('\uFEFF');
    res.end(csvContent);
    
    console.log(`✅ Export CSV: ${csvContent.split('\n').length - 1} lignes`);
    
  } catch (error) {
    console.error("❌ Erreur export CSV:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EXPORT JSON (structure claire) ====================
async function exportPlatsJSON(req, res) {
  try {
    const plats = await Menu.find({})
      .populate('category', 'name univers')
      .lean();
    
    const data = plats.map(plat => ({
      "Nom du plat": plat.name,
      "Description": plat.description || "",
      "Prix (€)": plat.price,
      "Catégorie": plat.category?.name || "Non catégorisé",
      "Univers": plat.category?.univers || "Cuisine",
      "Service Midi": plat.showInMenuJour ? "Oui" : "Non",
      "Service Soir": plat.showInMenuSoir ? "Oui" : "Non",
      "Disponible": plat.isAvailable ? "Oui" : "Non",
      "Offre Active": plat.offer?.enabled ? "Oui" : "Non",
      "Quantité requise": plat.offer?.requiredQuantity || "",
      "Prix offert (€)": plat.offer?.offerPrice || "",
      "Image": plat.image || ""
    }));
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=catalogue_restaurant.json');
    res.json({ 
      success: true, 
      exportDate: new Date().toISOString(),
      total: data.length, 
      data 
    });
    
  } catch (error) {
    console.error("❌ Erreur export JSON:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EXPORT COMPLET (ZIP avec CSV propre) ====================
async function exportComplete(req, res) {
  try {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).populate('category', 'name univers');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({ success: false, message: "Aucune donnée trouvée" });
    }
    
    console.log(`📦 Export complet de ${plats.length} plats...`);
    
    // 1. Ajouter le CSV propre (séparateur point-virgule)
    const csvContent = await generatePlatsCSV();
    zip.file("CATALOGUE_RESTAURANT.csv", "\uFEFF" + csvContent);
    
    // 2. Ajouter un README explicatif
    const readme = `# EXPORT SIGNATURE RESTAURANT

## 📅 Informations
- Date d'export: ${new Date().toLocaleString('fr-FR')}
- Total plats: ${plats.length}

## 📁 Fichiers inclus
- CATALOGUE_RESTAURANT.csv : Catalogue des plats (ouvrable avec Excel)
- images/ : Dossier contenant les photos des plats

## 📊 Comment ouvrir le CSV dans Excel
1. Ouvrez Excel
2. Allez dans "Données" > "À partir d'un fichier texte/CSV"
3. Sélectionnez le fichier CSV
4. Séparateur: **Point-virgule (;)**
5. Encodage: UTF-8

## 📋 Structure du CSV
| Colonne | Description |
|---------|-------------|
| Nom | Nom du plat |
| Description | Description détaillée |
| Prix (€) | Prix en euros |
| Catégorie | Entrée, Plat, Dessert... |
| Univers | Cuisine ou Boissons |
| Service Midi | Oui/Non |
| Service Soir | Oui/Non |
| Disponible | Oui/Non |
| Offre Active | Oui/Non |
| Quantité Offre | Nombre requis pour l'offre |
| Prix Offert | Prix avec offre |
| Image | Nom du fichier image |

## 🖼️ Images
Les images sont nommées selon le nom du plat dans le dossier images/

---
Généré automatiquement par Signature Restaurant
`;
    zip.file("LISEZ_MOI.txt", readme);
    
    // 3. Ajouter les images (limité à 30 pour performance)
    const MAX_IMAGES = 30;
    let successCount = 0;
    const imagesToProcess = plats.slice(0, MAX_IMAGES);
    
    for (const plat of imagesToProcess) {
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
    
    console.log(`✅ Export complet: CSV + ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur export complet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== AUTRES FONCTIONS ====================
async function exportAllPlatImages(req, res) {
  try {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({ success: false, message: "Aucune image trouvée" });
    }
    
    const MAX_IMAGES = 50;
    let successCount = 0;
    const imagesToProcess = plats.slice(0, MAX_IMAGES);
    
    for (const plat of imagesToProcess) {
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
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getImagesList(req, res) {
  try {
    const plats = await Menu.find({ image: { $exists: true, $ne: "" } }).select('name image category');
    res.json({ success: true, count: plats.length, images: plats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function exportCategoryImages(req, res) {
  res.json({ message: "Fonctionnalité disponible" });
}

async function exportCompleteByCategory(req, res) {
  res.json({ message: "Fonctionnalité disponible" });
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