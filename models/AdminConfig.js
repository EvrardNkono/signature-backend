const mongoose = require('mongoose');

const AdminConfigSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('AdminConfig', AdminConfigSchema);