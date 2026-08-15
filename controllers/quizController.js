const QuizSession = require('../models/QuizSession');
const QuizQuestion = require('../models/QuizQuestion');
const QuizLot = require('../models/QuizLot');

// ============================================================
// SESSIONS
// ============================================================

exports.getSessions = async (req, res) => {
  try {
    const sessions = await QuizSession.find().sort({ dateDebut: -1 });
    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const count = await QuizQuestion.countDocuments({ sessionId: session._id });
        return {
          ...session.toObject(),
          questionCount: count,
        };
      })
    );
    res.json(sessionsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSessionActive = async (req, res) => {
  try {
    const session = await QuizSession.findOne({ active: true }).sort({ dateDebut: -1 });
    if (!session) {
      return res.status(404).json({ message: 'Aucune session active' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { nom, dateDebut } = req.body;
    const session = new QuizSession({ nom, dateDebut: dateDebut || new Date() });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, dateDebut, dateFin, active } = req.body;
    const session = await QuizSession.findByIdAndUpdate(
      id,
      { nom, dateDebut, dateFin, active },
      { new: true, runValidators: true }
    );
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }
    res.json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    await QuizQuestion.deleteMany({ sessionId: id });
    await QuizSession.findByIdAndDelete(id);
    res.json({ message: 'Session supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// ACTIVATION/DÉSACTIVATION DU JEU
// ============================================================

exports.toggleJeu = async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;
    
    const session = await QuizSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }
    
    session.jeuActif = actif !== undefined ? actif : !session.jeuActif;
    await session.save();
    
    res.json({
      message: `Jeu ${session.jeuActif ? 'activé' : 'désactivé'}`,
      jeuActif: session.jeuActif,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// QUESTIONS
// ============================================================

exports.getQuestionsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const questions = await QuizQuestion.find({ sessionId }).sort({ ordre: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { sessionId, question, reponseA, reponseB, reponseC, reponseD, bonneReponse, ordre } = req.body;
    
    const session = await QuizSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    const newQuestion = new QuizQuestion({
      sessionId,
      question,
      reponseA,
      reponseB,
      reponseC,
      reponseD,
      bonneReponse,
      ordre: ordre || 0,
    });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, reponseA, reponseB, reponseC, reponseD, bonneReponse, ordre } = req.body;
    const updated = await QuizQuestion.findByIdAndUpdate(
      id,
      { question, reponseA, reponseB, reponseC, reponseD, bonneReponse, ordre },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    await QuizQuestion.findByIdAndDelete(id);
    res.json({ message: 'Question supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifierReponse = async (req, res) => {
  try {
    const { questionId, reponse } = req.body;
    const question = await QuizQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    const correct = question.bonneReponse === reponse;
    res.json({
      correct,
      bonneReponse: question.bonneReponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// LOTS
// ============================================================

exports.getLots = async (req, res) => {
  try {
    const lots = await QuizLot.find().sort({ probabilite: -1 });
    res.json(lots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLotsActifs = async (req, res) => {
  try {
    const lots = await QuizLot.find({ actif: true }).sort({ probabilite: -1 });
    res.json(lots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createLot = async (req, res) => {
  try {
    const { nom, description, probabilite, typeLot, codePromo, image, actif } = req.body;
    const lot = new QuizLot({
      nom,
      description,
      probabilite,
      typeLot: typeLot || 'code_genere',
      codePromo,
      image,
      actif: actif !== undefined ? actif : true,
    });
    await lot.save();
    res.status(201).json(lot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateLot = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, probabilite, typeLot, codePromo, image, actif } = req.body;
    const updated = await QuizLot.findByIdAndUpdate(
      id,
      { nom, description, probabilite, typeLot, codePromo, image, actif },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Lot non trouvé' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteLot = async (req, res) => {
  try {
    const { id } = req.params;
    await QuizLot.findByIdAndDelete(id);
    res.json({ message: 'Lot supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// ROUE (sans base de données joueur)
// ============================================================

exports.spinWheel = async (req, res) => {
  try {
    const { playerId } = req.body;

    // Récupérer les lots actifs
    const lots = await QuizLot.find({ actif: true });
    if (lots.length === 0) {
      return res.status(404).json({ message: 'Aucun lot disponible' });
    }

    // Calculer le total des probabilités
    const totalProb = lots.reduce((acc, l) => acc + l.probabilite, 0);
    if (totalProb === 0) {
      return res.status(400).json({ message: 'Les probabilités sont nulles' });
    }

    // Tirer un lot aléatoire
    let random = Math.random() * totalProb;
    let selectedLot = lots[0];
    for (const lot of lots) {
      random -= lot.probabilite;
      if (random <= 0) {
        selectedLot = lot;
        break;
      }
    }

    // Générer un code promo si nécessaire
    let codePromo = null;
    if (selectedLot.typeLot === 'code_genere') {
      const prefix = 'SIG';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      codePromo = prefix + '-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } else if (selectedLot.typeLot === 'code_fixe') {
      codePromo = selectedLot.codePromo;
    }

    // Pas de sauvegarde en BDD, le frontend gère tout avec Local Storage
    // On retourne juste le résultat

    res.json({
      lot: selectedLot,
      codePromo,
      message: `🎉 Félicitations ! Vous avez gagné : ${selectedLot.nom}`,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// STATISTIQUES (simulées)
// ============================================================

exports.getStatistiques = async (req, res) => {
  try {
    // Comme on utilise Local Storage, les stats sont limitées
    // On retourne des données par défaut
    res.json({
      totalParties: 0,
      totalJoueurs: 0,
      moyenneScore: 0,
      tauxReussite: 0,
      repartitionScores: {
        score0: 0,
        score1: 0,
        score2: 0,
        score3: 0,
        score4: 0,
        score5: 0,
      },
      lotsDistribues: [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};