// controllers/exportController.js
const archiver = require('archiver');
const mongoose = require('mongoose');
const Menu = require('../models/Menu');
const Category = require('../models/Category');
const axios = require('axios');
const stream = require('stream');

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Télécharger une image depuis une URL et la retourner sous forme de buffer
 */
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
    console.error(`❌ Erreur téléchargement image ${url}:`, error.message);
    return null;
  }
}

/**
 * Nettoyer le nom du fichier (enlever caractères spéciaux)
 */
function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Générer le contenu CSV à partir des plats
 */
async function generatePlatsCSV(filterCategoryId = null) {
  let query = {};
  if (filterCategoryId) {
    query.category = filterCategoryId;
  }
  
  const plats = await Menu.find(query)
    .populate('category', 'name univers')
    .lean();
  
  // En-têtes du CSV
  let csvContent = "Nom du plat,Description,Prix (€),Catégorie,Univers,Service Midi,Service Soir,Disponible,Offre active,Quantité requise offre,Prix offert (€),Nom de l'image,ID du plat\n";
  
  for (const plat of plats) {
    // Échapper les guillemets dans les descriptions
    const description = (plat.description || "").replace(/"/g, '""');
    const name = plat.name.replace(/"/g, '""');
    const categoryName = plat.category?.name || "Non catégorisé";
    const univers = plat.category?.univers || "Cuisine";
    
    // Déterminer l'extension de l'image
    let imageExtension = '';
    if (plat.image) {
      if (plat.image.includes('.png')) imageExtension = 'png';
      else if (plat.image.includes('.webp')) imageExtension = 'webp';
      else if (plat.image.includes('.jpeg')) imageExtension = 'jpeg';
      else imageExtension = 'jpg';
    }
    
    // Générer le nom de l'image attendu
    const imageName = plat.image ? `${sanitizeFileName(plat.name)}.${imageExtension}` : "";
    
    const ligne = [
      `"${name}"`,
      `"${description}"`,
      plat.price,
      `"${categoryName}"`,
      `"${univers}"`,
      plat.showInMenuJour ? "Oui" : "Non",
      plat.showInMenuSoir ? "Oui" : "Non",
      plat.isAvailable ? "Oui" : "Non",
      plat.offer?.enabled ? "Oui" : "Non",
      plat.offer?.requiredQuantity || 0,
      plat.offer?.offerPrice || 0,
      imageName,
      plat._id.toString()
    ].join(",");
    
    csvContent += ligne + "\n";
  }
  
  return csvContent;
}

/**
 * Générer un README pour l'archive
 */
function generateReadmeContent(stats) {
  return `# EXPORT SIGNATURE RESTAURANT

## 📅 Informations générales
- Date d'export: ${new Date().toLocaleString('fr-FR')}
- Export généré par: Signature Restaurant Admin

## 📊 Statistiques
- Total des plats exportés: ${stats.totalPlats}
- Images téléchargées avec succès: ${stats.successCount}
- Échecs de téléchargement: ${stats.errorCount}
- Fichiers dans l'archive: ${stats.totalFiles}

## 📁 Contenu de l'archive
${stats.hasCSV ? '- 📄 CATALOGUE_COMPLET.csv : Fichier Excel contenant tous les plats' : ''}
${stats.hasImages ? '- 🖼️ Dossier images/ : Toutes les images des plats' : ''}
${stats.hasReadme ? '- 📖 LISEZ_MOI.txt : Ce fichier' : ''}
${stats.hasMetadata ? '- 📊 metadata.json : Métadonnées au format JSON' : ''}

## 💡 Comment utiliser le CSV
1. Ouvrez le fichier avec Excel, LibreOffice Calc ou Google Sheets
2. Utilisez les colonnes pour trier/filtrer vos données
3. Les noms d'images correspondent aux fichiers dans ce ZIP

## 📋 Colonnes du CSV
| Colonne | Description |
|---------|-------------|
| Nom du plat | Le nom du plat |
| Description | La description détaillée |
| Prix (€) | Prix en euros |
| Catégorie | Catégorie du plat (Entrée, Plat, Dessert...) |
| Univers | Cuisine ou Boissons |
| Service Midi | Disponible au déjeuner (Oui/Non) |
| Service Soir | Disponible au dîner (Oui/Non) |
| Disponible | Actuellement disponible (Oui/Non) |
| Offre active | Offre spéciale active (Oui/Non) |
| Quantité requise offre | Nombre d'articles pour l'offre |
| Prix offert (€) | Prix spécial de l'offre |
| Nom de l'image | Nom du fichier image associé |

## 🔧 Support technique
En cas de problème avec cet export, contactez l'administrateur du système.

---
Signature Restaurant - Cuisine d'exception
`;
}

/**
 * Générer les métadonnées JSON
 */
function generateMetadata(plats, successCount, errorCount, errors) {
  return {
    exportDate: new Date().toISOString(),
    exportDateLocale: new Date().toLocaleString('fr-FR'),
    version: "1.0.0",
    statistics: {
      totalPlats: plats.length,
      successCount,
      errorCount,
      successRate: `${((successCount / plats.length) * 100).toFixed(2)}%`
    },
    plats: plats.map(plat => {
      let extension = '';
      if (plat.image) {
        if (plat.image.includes('.png')) extension = 'png';
        else if (plat.image.includes('.webp')) extension = 'webp';
        else if (plat.image.includes('.jpeg')) extension = 'jpeg';
        else extension = 'jpg';
      }
      
      return {
        id: plat._id,
        name: plat.name,
        originalUrl: plat.image,
        fileName: plat.image ? `${sanitizeFileName(plat.name)}.${extension}` : null,
        category: plat.category?.name || null,
        univers: plat.category?.univers || null,
        price: plat.price,
        showInMenuJour: plat.showInMenuJour,
        showInMenuSoir: plat.showInMenuSoir,
        isAvailable: plat.isAvailable
      };
    }),
    errors: errors
  };
}

// ==================== EXPORT DES IMAGES ====================

/**
 * Exporter TOUTES les images des plats (ZIP)
 */
async function exportAllPlatImages(req, res) {
  try {
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune image de plat trouvée dans la base de données"
      });
    }

    console.log(`📸 Export de ${plats.length} images de plats...`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_images_${Date.now()}.zip`);
    
    archive.pipe(res);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const plat of plats) {
      if (!plat.image) continue;
      
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      
      console.log(`📥 Téléchargement: ${plat.name} -> ${fileName}`);
      
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        archive.append(imageBuffer, { name: `images/${fileName}` });
        successCount++;
      } else {
        errorCount++;
        errors.push({ name: plat.name, url: plat.image });
        archive.append(`❌ Impossible de télécharger: ${plat.name}\nURL: ${plat.image}\n`, 
          { name: `erreurs/${sanitizeFileName(plat.name)}.txt` });
      }
    }

    const readmeContent = generateReadmeContent({
      totalPlats: plats.length,
      successCount,
      errorCount,
      totalFiles: successCount + errorCount + 2,
      hasCSV: false,
      hasImages: true,
      hasReadme: true,
      hasMetadata: true
    });
    
    archive.append(readmeContent, { name: 'LISEZ_MOI.txt' });
    
    const metadata = generateMetadata(plats, successCount, errorCount, errors);
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
    
    await archive.finalize();
    
    console.log(`✅ Export terminé: ${successCount} succès, ${errorCount} échecs`);
    
  } catch (error) {
    console.error("❌ Erreur lors de l'export des images:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération de l'archive",
      error: error.message
    });
  }
}

/**
 * Exporter les images d'une catégorie spécifique
 */
async function exportCategoryImages(req, res) {
  try {
    const { categoryId } = req.params;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie non trouvée" });
    }
    
    const plats = await Menu.find({ 
      category: categoryId,
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image category');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune image trouvée pour cette catégorie"
      });
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    const categoryName = sanitizeFileName(category.name);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_${categoryName}_${Date.now()}.zip`);
    
    archive.pipe(res);
    
    let successCount = 0;
    
    for (const plat of plats) {
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        archive.append(imageBuffer, { name: `images/${fileName}` });
        successCount++;
      }
    }
    
    // Ajouter README spécifique à la catégorie
    const categoryReadme = `# Export de la catégorie: ${category.name}

📅 Date d'export: ${new Date().toLocaleString('fr-FR')}
📸 Images exportées: ${successCount}/${plats.length}

## Liste des plats:
${plats.map(p => `- ${p.name}`).join('\n')}
`;
    archive.append(categoryReadme, { name: 'LISEZ_MOI.txt' });
    
    await archive.finalize();
    
    console.log(`✅ Export catégorie "${category.name}" terminé: ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Obtenir la liste des images disponibles sans les télécharger
 */
async function getImagesList(req, res) {
  try {
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image category');
    
    const imagesList = plats.map(plat => ({
      name: plat.name,
      url: plat.image,
      category: plat.category
    }));
    
    res.json({
      success: true,
      count: imagesList.length,
      images: imagesList
    });
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EXPORT DES DONNÉES (CSV) ====================

/**
 * Exporter les données des plats au format CSV
 */
async function exportPlatsData(req, res) {
  try {
    const csvContent = await generatePlatsCSV();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=plats_catalogue.csv');
    res.write('\uFEFF'); // BOM pour UTF-8 (compatibilité Excel)
    res.end(csvContent);
    
    console.log(`✅ Export CSV terminé`);
    
  } catch (error) {
    console.error("❌ Erreur export CSV:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Exporter les données des plats au format JSON
 */
async function exportPlatsJSON(req, res) {
  try {
    const plats = await Menu.find({})
      .populate('category', 'name univers')
      .lean();
    
    const data = plats.map(plat => ({
      id: plat._id,
      name: plat.name,
      description: plat.description,
      price: plat.price,
      category: plat.category?.name,
      categoryId: plat.category?._id,
      univers: plat.category?.univers,
      showInMenuJour: plat.showInMenuJour,
      showInMenuSoir: plat.showInMenuSoir,
      isAvailable: plat.isAvailable,
      isChefSpecial: plat.isChefSpecial,
      image: plat.image,
      offer: plat.offer?.enabled ? {
        enabled: true,
        requiredQuantity: plat.offer.requiredQuantity,
        offerPrice: plat.offer.offerPrice
      } : null,
      hasAccompaniment: plat.hasAccompaniment,
      allowSupplements: plat.allowSupplements,
      createdAt: plat.createdAt
    }));
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=plats_catalogue.json');
    res.json({ 
      success: true, 
      exportDate: new Date().toISOString(),
      count: data.length, 
      data 
    });
    
  } catch (error) {
    console.error("❌ Erreur export JSON:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EXPORT COMPLET (IMAGES + CSV) ====================

/**
 * Exporter TOUT (images + CSV) en un seul ZIP
 */
async function exportComplete(req, res) {
  try {
    const plats = await Menu.find({ 
      image: { $exists: true, $ne: null, $ne: "" } 
    }).populate('category', 'name univers');
    
    const csvContent = await generatePlatsCSV();
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune donnée trouvée dans la base de données"
      });
    }

    console.log(`📦 Export complet de ${plats.length} plats...`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_complet_${Date.now()}.zip`);
    
    archive.pipe(res);

    // 1. Ajouter le fichier CSV
    archive.append("\uFEFF" + csvContent, { name: '00_CATALOGUE_COMPLET.csv' });
    console.log("✅ Fichier CSV ajouté");
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 2. Ajouter les images
    for (const plat of plats) {
      if (!plat.image) continue;
      
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      
      console.log(`📥 Téléchargement: ${plat.name} -> ${fileName}`);
      
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        archive.append(imageBuffer, { name: `images/${fileName}` });
        successCount++;
      } else {
        errorCount++;
        errors.push({ name: plat.name, url: plat.image });
        archive.append(`❌ Erreur: ${plat.name}\nURL: ${plat.image}\n`, 
          { name: `erreurs/${sanitizeFileName(plat.name)}.txt` });
      }
    }

    // 3. Ajouter le README
    const readmeContent = generateReadmeContent({
      totalPlats: plats.length,
      successCount,
      errorCount,
      totalFiles: plats.length + 3,
      hasCSV: true,
      hasImages: true,
      hasReadme: true,
      hasMetadata: true
    });
    
    archive.append(readmeContent, { name: 'LISEZ_MOI.txt' });
    
    // 4. Ajouter les métadonnées JSON
    const metadata = generateMetadata(plats, successCount, errorCount, errors);
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
    
    await archive.finalize();
    
    console.log(`✅ Export complet terminé: ${successCount} images, 1 CSV, README, metadata`);
    
  } catch (error) {
    console.error("❌ Erreur export complet:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'export complet",
      error: error.message 
    });
  }
}

/**
 * Exporter les données d'une catégorie spécifique (images + CSV filtré)
 */
async function exportCompleteByCategory(req, res) {
  try {
    const { categoryId } = req.params;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie non trouvée" });
    }
    
    const plats = await Menu.find({ 
      category: categoryId,
      image: { $exists: true, $ne: null, $ne: "" } 
    }).populate('category', 'name univers');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucun plat trouvé pour cette catégorie"
      });
    }
    
    // Générer CSV spécifique à la catégorie
    const csvContent = await generatePlatsCSV(categoryId);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    const categoryName = sanitizeFileName(category.name);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=signature_${categoryName}_${Date.now()}.zip`);
    
    archive.pipe(res);
    
    // Ajouter le CSV
    archive.append("\uFEFF" + csvContent, { name: `${categoryName}_catalogue.csv` });
    
    let successCount = 0;
    
    // Ajouter les images
    for (const plat of plats) {
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        archive.append(imageBuffer, { name: `images/${fileName}` });
        successCount++;
      }
    }
    
    // Ajouter README spécifique
    const categoryReadme = `# Export de la catégorie: ${category.name}

📅 Date d'export: ${new Date().toLocaleString('fr-FR')}
📊 Plats exportés: ${plats.length}
✅ Images téléchargées: ${successCount}

## Liste des plats:
${plats.map(p => `- ${p.name} (${p.price}€)`).join('\n')}

## Fichiers inclus:
- 📄 ${categoryName}_catalogue.csv : Catalogue Excel
- 🖼️ images/ : Dossier contenant toutes les images
`;
    archive.append(categoryReadme, { name: 'LISEZ_MOI.txt' });
    
    await archive.finalize();
    
    console.log(`✅ Export catégorie "${category.name}" complet: ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur export catégorie complète:", error);
    res.status(500).json({ success: false, error: error.message });
  }
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