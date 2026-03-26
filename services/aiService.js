const { GoogleGenAI } = require("@google/genai");

// Initialisation sécurisée
const genAI = new GoogleGenAI(process.env.GEMINI_KEY || ""); 

const generateChatResponse = async (message, history = []) => {
  try {
    // Correction ici : on récupère d'abord le modèle
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Utilise 1.5-flash (le 2.5 n'est pas encore standard)
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.6,
      }
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Tu es Gluttony, l'ambassadeur du restaurant Signature à Melun. Ton ton est prestigieux et accueillant. RÈGLE D'OR : Tes réponses doivent être complètes et se terminer par une ponctuation finale. Sois direct mais élégant." }]
        },
        {
          role: "model",
          parts: [{ text: "Je comprends parfaitement. Je serai l'expression de l'élégance concise pour Signature." }]
        },
        // On transforme l'historique au format attendu par Gemini
        ...history.slice(-4).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : (msg.parts?.[0]?.text || "") }]
        }))
      ]
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    console.error("ERREUR INTELLIGENCE GLUTTONY:", error.message);
    return "Une légère interruption en cuisine. Je suis à nouveau à vous, que désirez-vous savoir sur Signature ?";
  }
};

module.exports = { generateChatResponse };