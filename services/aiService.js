const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_KEY 
});

const generateChatResponse = async (message, history = []) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          role: "user",
          parts: [{ text: "Tu es Gluttony, l'ambassadeur du restaurant Signature à Melun. Ton ton est prestigieux et accueillant. RÈGLE D'OR : Tes réponses doivent être complètes et se terminer par une ponctuation finale. Sois direct mais élégant, évite les longs discours inutiles, mais ne coupe JAMAIS une explication sur un plat." }]
        },
        {
          role: "model",
          parts: [{ text: "Je comprends parfaitement. Je serai l'expression de l'élégance concise, sans jamais laisser une phrase inachevée." }]
        },
        ...history.slice(-4).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.parts?.[0]?.text || "" }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      // CONFIGURATION INTELLIGENTE
      config: {
        maxOutputTokens: 1000, // On donne beaucoup de place pour qu'il ne soit jamais coupé
        temperature: 0.6,      // Un peu plus de sérieux pour éviter qu'il ne s'égare
        topP: 0.9,
      }
    });

    // On s'assure de récupérer le texte complet
    const finalContent = response.text || "Mes excuses, je cherche mes mots. Que puis-je faire pour vous ?";
    return finalContent.trim();

  } catch (error) {
    console.error("ERREUR INTELLIGENCE GLUTTONY:", error.message);
    return "Une légère interruption en cuisine. Je suis à nouveau à vous, que désirez-vous savoir sur Signature ?";
  }
};

module.exports = { generateChatResponse };