// routes/settings.js
const express = require("express");
const router = express.Router();

// Stockage simple en mémoire (ou remplacez par un modèle Mongoose)
let appSettings = {
  deliveryAvailable: true,
};

router.get("/", (req, res) => {
  res.json({ success: true, data: appSettings });
});

router.put("/", (req, res) => {
  const { deliveryAvailable } = req.body;
  if (typeof deliveryAvailable === "boolean") {
    appSettings.deliveryAvailable = deliveryAvailable;
  }
  res.json({ success: true, data: appSettings });
});

module.exports = router;