const Menu = require('../models/Menu');
const { generateChatResponse } = require('../services/aiService');

exports.handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    // Sécurité : vérifier que le message n'est pas vide
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Le message est vide." });
    }

    // 1. Récupération optimisée du menu
    // On ne récupère que les plats disponibles pour ne pas surcharger le prompt
    const menuItems = await Menu.find({ isAvailable: true })
      .populate('category')
      .select('name description price category offer showInMenuJour showInMenuSoir hasAccompaniment allowSupplements')
      .lean();

    // 2. Appel à Gluttony avec les données fraîches
    const reply = await generateChatResponse(message, history || [], menuItems);

    // 3. Réponse au format attendu par ton frontend Chatbot.tsx
    res.status(200).json({ 
      success: true,
      text: reply 
    });

  } catch (error) {
    console.error("Erreur Controller Chat:", error);
    res.status(500).json({ 
      success: false,
      text: "Mes excuses, je n'arrive pas à consulter la carte en cuisine. Réessayez dans un instant ?" 
    });
  }
};