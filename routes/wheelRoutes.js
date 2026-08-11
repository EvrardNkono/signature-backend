const WheelSettings = require('../models/WheelSettings');

// ==================== GET ====================
const getWheelSettings = async (req, res) => {
  try {
    let settings = await WheelSettings.findOne();

    // Si aucun setting n'existe, créer les defaults
    if (!settings) {
      settings = new WheelSettings({
        isActive: true,
        title: "🎡 Tentez votre chance",
        subtitle: "Gagnez des plats offerts !",
        buttonText: "Jouer"
      });
      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Erreur getWheelSettings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des settings'
    });
  }
};

// ==================== PUT ====================
const updateWheelSettings = async (req, res) => {
  try {
    const { isActive, title, subtitle, buttonText } = req.body;

    let settings = await WheelSettings.findOne();

    if (!settings) {
      settings = new WheelSettings();
    }

    // Mettre à jour les champs
    if (isActive !== undefined) settings.isActive = isActive;
    if (title) settings.title = title;
    if (subtitle) settings.subtitle = subtitle;
    if (buttonText) settings.buttonText = buttonText;

    settings.updatedBy = req.user?.id || 'admin';

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Paramètres du jeu mis à jour',
      data: settings
    });
  } catch (error) {
    console.error('Erreur updateWheelSettings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des settings'
    });
  }
};

// ==================== TOGGLE ====================
const toggleWheelGame = async (req, res) => {
  try {
    const { isActive } = req.body;

    let settings = await WheelSettings.findOne();

    if (!settings) {
      settings = new WheelSettings();
    }

    settings.isActive = isActive !== undefined ? isActive : !settings.isActive;
    settings.updatedBy = req.user?.id || 'admin';

    await settings.save();

    res.status(200).json({
      success: true,
      message: `Jeu ${settings.isActive ? 'activé' : 'désactivé'}`,
      data: settings
    });
  } catch (error) {
    console.error('Erreur toggleWheelGame:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du toggle du jeu'
    });
  }
};

// ==================== STATS ====================
const getWheelStats = async (req, res) => {
  try {
    // Compter les participations (à ajouter dans votre logique)
    const totalPlays = 0; // À implémenter avec un modèle de logs

    res.status(200).json({
      success: true,
      data: {
        totalPlays,
        lastPlay: null
      }
    });
  } catch (error) {
    console.error('Erreur getWheelStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats'
    });
  }
};

module.exports = {
  getWheelSettings,
  updateWheelSettings,
  toggleWheelGame,
  getWheelStats
};