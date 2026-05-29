// controllers/exportController.js
const archiver = require('archiver');
const mongoose = require('mongoose');
const Menu = require('../models/Menu');
const axios = require('axios');
const stream = require('stream');

// Télécharger une image depuis une URL et la retourner sous forme de buffer
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

// Nettoyer le nom du fichier (enlever caractères spéciaux)
function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

// Générer une archive ZIP de toutes les images des plats
async function exportAllPlatImages(req, res) {
  try {
    // Récupérer tous les plats qui ont une image
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

    // Créer l'archive ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Niveau de compression maximum
    });

    // Configurer les en-têtes de réponse
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=plats_images_${Date.now()}.zip`);
    
    // Pipe l'archive vers la réponse
    archive.pipe(res);

    // Télécharger et ajouter chaque image à l'archive
    let successCount = 0;
    let errorCount = 0;

    for (const plat of plats) {
      if (!plat.image) continue;
      
      // Déterminer l'extension du fichier
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      if (plat.image.includes('.jpeg')) extension = 'jpeg';
      
      // Créer un nom de fichier propre
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      
      console.log(`📥 Téléchargement: ${plat.name} -> ${fileName}`);
      
      // Télécharger l'image
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        // Ajouter le fichier à l'archive
        archive.append(imageBuffer, { name: fileName });
        successCount++;
      } else {
        errorCount++;
        // Ajouter un fichier texte pour signaler l'erreur
        const errorMsg = `❌ Impossible de télécharger: ${plat.name}\nURL: ${plat.image}\n`;
        archive.append(errorMsg, { name: `_erreurs/${sanitizeFileName(plat.name)}.txt` });
      }
    }

    // Ajouter un fichier README avec des informations
    const readmeContent = `
# Export des images des plats

📅 Date d'export: ${new Date().toLocaleString('fr-FR')}
📸 Total des plats trouvés: ${plats.length}
✅ Images téléchargées avec succès: ${successCount}
❌ Échecs de téléchargement: ${errorCount}

## Notes
- Les noms des fichiers ont été nettoyés (accents supprimés, espaces remplacés par _)
- Les images en erreur sont listées dans le dossier _erreurs/
- Pour toute question, contactez l'administrateur

## Liste des plats exportés:
${plats.map(p => `- ${p.name}`).join('\n')}
`;
    
    archive.append(readmeContent, { name: 'README.txt' });
    
    // Ajouter un fichier JSON avec les métadonnées
    const metadata = {
      exportDate: new Date().toISOString(),
      totalImages: plats.length,
      successCount,
      errorCount,
      plats: plats.map(p => ({
        name: p.name,
        originalUrl: p.image,
        fileName: `${sanitizeFileName(p.name)}.${p.image.includes('.png') ? 'png' : p.image.includes('.webp') ? 'webp' : 'jpg'}`
      }))
    };
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
    
    // Finaliser l'archive
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

// Exporter les images d'une catégorie spécifique
async function exportCategoryImages(req, res) {
  try {
    const { categoryId } = req.params;
    
    const plats = await Menu.find({ 
      category: categoryId,
      image: { $exists: true, $ne: null, $ne: "" } 
    }).select('name image');
    
    if (!plats || plats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune image trouvée pour cette catégorie"
      });
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=category_images_${Date.now()}.zip`);
    
    archive.pipe(res);
    
    let successCount = 0;
    
    for (const plat of plats) {
      let extension = 'jpg';
      if (plat.image.includes('.png')) extension = 'png';
      if (plat.image.includes('.webp')) extension = 'webp';
      
      const fileName = `${sanitizeFileName(plat.name)}.${extension}`;
      const imageBuffer = await downloadImage(plat.image);
      
      if (imageBuffer) {
        archive.append(imageBuffer, { name: fileName });
        successCount++;
      }
    }
    
    await archive.finalize();
    
    console.log(`✅ Export catégorie terminé: ${successCount} images`);
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Obtenir la liste des images disponibles sans les télécharger
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

module.exports = {
  exportAllPlatImages,
  exportCategoryImages,
  getImagesList
};