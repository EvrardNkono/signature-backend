const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../services/aiService');

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // On appelle notre service
    const reply = await generateChatResponse(message, history);
    
    res.json({ text: reply });
  } catch (error) {
    console.error("Erreur Route Chat:", error);
    res.status(500).json({ error: "Gluttony est momentanément indisponible." });
  }
});

module.exports = router;