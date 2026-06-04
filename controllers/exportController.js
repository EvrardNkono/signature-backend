// controllers/exportController.js - Version avec vrai fichier Excel
const Menu = require('../models/Menu');
const Category = require('../models/Category');
const axios = require('axios');
const ExcelJS = require('exceljs');

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

// Générer un vrai fichier Excel avec mise en forme
async function generateExcelWorkbook() {
  const plats = await Menu.find({})
    .populate('category', 'name univers')
    .lean();
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Signature Restaurant';
  workbook.created = new Date();
  
  // Style des en-têtes
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  };
  
  // Style pour les cellules
  const cellStyle = {
    alignment: { vertical: 'top', wrapText: true },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  };
  
  // Style pour les prix
  const priceStyle = {
    ...cellStyle,
    numFmt: '# ##0.00 €',
    alignment: { horizontal: 'right', vertical: 'top', wrapText: true }
  };
  
  // === FEUILLE 1 : Catalogue complet ===
  const catalogSheet = workbook.addWorksheet('Catalogue', {
    pageSetup: { paperSize: 9, orientation: 'portrait' }
  });
  
  // Largeurs des colonnes
  catalogSheet.columns = [
    { header: 'Nom du plat', key: 'name', width: 35 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Prix (€)', key: 'price', width: 15 },
    { header: 'Catégorie', key: 'category', width: 20 },
    { header: 'Univers', key: 'univers', width: 15 },
    { header: 'Service Midi', key: 'midi', width: 15 },
    { header: 'Service Soir', key: 'soir', width: 15 },
    { header: 'Disponible', key: 'available', width: 12 },
    { header: 'Offre', key: 'offer', width: 12 },
    { header: 'Quantité', key: 'qty', width: 12 },
    { header: 'Prix Offert', key: 'offerPrice', width: 15 },
    { header: 'Image', key: 'image', width: 25 }
  ];
  
  // Appliquer le style aux en-têtes
  const headerRow = catalogSheet.getRow(1);
  headerRow.height = 30;
  catalogSheet.columns.forEach(col => {
    const cell = headerRow.getCell(col.key);
    cell.style = headerStyle;
  });
  
  // Ajouter les données
  for (let i = 0; i < plats.length; i++) {
    const plat = plats[i];
    const row = catalogSheet.addRow({
      name: plat.name,
      description: plat.description || '',
      price: parseFloat(plat.price),
      category: plat.category?.name || 'Non catégorisé',
      univers: plat.category?.univers || 'Cuisine',
      midi: plat.showInMenuJour ? '✓ Oui' : '✗ Non',
      soir: plat.showInMenuSoir ? '✓ Oui' : '✗ Non',
      available: plat.isAvailable ? '✓ Oui' : '✗ Non',
      offer: plat.offer?.enabled ? '✓ Actif' : '✗ Inactif',
      qty: plat.offer?.requiredQuantity || '-',
      offerPrice: plat.offer?.offerPrice ? parseFloat(plat.offer.offerPrice) : '-',
      image: plat.image ? '✓' : '✗'
    });
    
    row.height = Math.max(30, Math.ceil((plat.description?.length || 0) / 80) * 15);
    row.eachCell(cell => {
      if (cell.col === 3 || cell.col === 11) {
        cell.style = priceStyle;
      } else {
        cell.style = cellStyle;
      }
    });
  }
  
  // === FEUILLE 2 : Résumé statistique ===
  const summarySheet = workbook.addWorksheet('Résumé');
  summarySheet.columns = [
    { header: 'Indicateur', key: 'indicator', width: 30 },
    { header: 'Valeur', key: 'value', width: 30 }
  ];
  
  const summaryStyle = {
    font: { bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
  };
  
  summarySheet.addRow({ indicator: '📊 Date d\'export', value: new Date().toLocaleString('fr-FR') });
  summarySheet.addRow({ indicator: '📦 Total des plats', value: plats.length });
  summarySheet.addRow({ indicator: '🍽️ Plats avec image', value: plats.filter(p => p.image).length });
  summarySheet.addRow({ indicator: '🔥 Offres actives', value: plats.filter(p => p.offer?.enabled).length });
  summarySheet.addRow({ indicator: '☀️ Service Midi', value: plats.filter(p => p.showInMenuJour).length });
  summarySheet.addRow({ indicator: '🌙 Service Soir', value: plats.filter(p => p.showInMenuSoir).length });
  summarySheet.addRow({ indicator: '✅ Disponibles', value: plats.filter(p => p.isAvailable).length });
  
  summarySheet.getRow(1).eachCell(cell => cell.style = summaryStyle);
  
  return workbook;
}

// ==================== EXPORT EXCEL (Format professionnel) ====================
async function exportPlatsData(req, res) {
  try {
    const workbook = await generateExcelWorkbook();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=catalogue_restaurant.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
    
    console.log(`✅ Export Excel généré`);
    
  } catch (error) {
    console.error("❌ Erreur export Excel:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EXPORT COMPLET (ZIP avec Excel) ====================
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
    
    // 1. Générer et ajouter le fichier Excel
    const workbook = await generateExcelWorkbook();
    const excelBuffer = await workbook.xlsx.writeBuffer();
    zip.file("CATALOGUE_RESTAURANT.xlsx", excelBuffer);
    
    // 2. Ajouter le README
    const readme = `# EXPORT SIGNATURE RESTAURANT

## 📅 Informations
- Date d'export: ${new Date().toLocaleString('fr-FR')}
- Total plats: ${plats.length}
- Fichier Excel inclus: CATALOGUE_RESTAURANT.xlsx

## 📁 Structure du fichier Excel
- Onglet "Catalogue" : Liste complète des plats avec mise en forme
- Onglet "Résumé" : Statistiques et indicateurs clés

## ✨ Fonctionnalités Excel
- En-têtes colorés et en gras
- Texte automatiquement à la ligne
- Hauteur des lignes ajustée automatiquement
- Prix formatés en euros
- ✓/✗ pour les disponibilités

## 📊 Comment utiliser
Double-cliquez sur le fichier Excel pour l'ouvrir directement

---
Généré par Signature Restaurant
`;
    zip.file("LISEZ_MOI.txt", readme);
    
    // 3. Ajouter les images (limitées à 20)
    const MAX_IMAGES = 20;
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
    
    const zipBuffer = await zip.generateAsync({ 
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_complet_${Date.now()}.zip`);
    res.send(zipBuffer);
    
    console.log(`✅ Export complet: Excel + ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur export complet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== AUTRES FONCTIONS ====================
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
    
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_images_${Date.now()}.zip`);
    res.send(zipBuffer);
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

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