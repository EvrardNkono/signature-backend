const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// ============================================================
// SESSIONS
// ============================================================
router.get('/sessions', quizController.getSessions);
router.get('/session/active', quizController.getSessionActive);
router.post('/sessions', quizController.createSession);
router.put('/sessions/:id', quizController.updateSession);
router.delete('/sessions/:id', quizController.deleteSession);

// ✅ NOUVEAU - Activer/Désactiver le jeu
router.patch('/sessions/:id/toggle', quizController.toggleJeu);

// ============================================================
// QUESTIONS
// ============================================================
router.get('/questions/:sessionId', quizController.getQuestionsBySession);
router.post('/questions', quizController.createQuestion);
router.put('/questions/:id', quizController.updateQuestion);
router.delete('/questions/:id', quizController.deleteQuestion);
router.post('/verifier', quizController.verifierReponse);

// ============================================================
// LOTS
// ============================================================
router.get('/lots', quizController.getLots);
router.get('/lots/actifs', quizController.getLotsActifs);
router.post('/lots', quizController.createLot);
router.put('/lots/:id', quizController.updateLot);
router.delete('/lots/:id', quizController.deleteLot);

// ============================================================
// ROUE
// ============================================================
router.post('/roue', quizController.spinWheel);

// ============================================================
// STATISTIQUES
// ============================================================
router.get('/statistiques', quizController.getStatistiques);

module.exports = router;