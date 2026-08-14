// models/Blog.js
const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Le titre est obligatoire"]
  },
  slug: {
    type: String,
    required: [true, "Le slug est obligatoire"],
    unique: true
  },
  excerpt: {
    type: String,
    default: ""
  },
  content: {
    type: String,
    required: [true, "Le contenu est obligatoire"]
  },
  coverImage: {
    type: String,
    default: ""
  },
  author: {
    type: String,
    default: "Restaurant Signature"
  },
  category: {
    type: String,
    default: "Actualités"
  },
  tags: {
    type: [String],
    default: []
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ⚠️ PAS DE pre('save') - même choix que Popup.js, la logique (slug, dates) se fait dans les routes

module.exports = mongoose.model('Blog', BlogSchema);
