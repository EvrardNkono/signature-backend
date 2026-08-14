// routes/blogRoutes.js
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// ==================== UTILITAIRE ====================

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function generateUniqueSlug(title, excludeId = null) {
  const base = slugify(title);
  let slug = base;
  let counter = 1;

  while (await Blog.findOne({ slug, _id: { $ne: excludeId } })) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// ==================== ADMIN (CRUD complet) ====================

// Récupérer TOUS les articles (pour l'admin, publiés + brouillons)
router.get('/admin', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (err) {
    console.error("Erreur GET /admin:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Récupérer un article par ID (pour l'édition admin)
router.get('/admin/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Article non trouvé" });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    console.error("Erreur GET /admin/:id:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Créer un nouvel article
router.post('/', async (req, res) => {
  console.log("📥 [POST] Données reçues:", JSON.stringify(req.body, null, 2));

  try {
    const { title, excerpt, content, coverImage, author, category, tags, isPublished } = req.body;

    // Validation des champs requis
    const errors = [];
    if (!title) errors.push("Le titre est obligatoire");
    if (!content) errors.push("Le contenu est obligatoire");

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(", ")
      });
    }

    const slug = await generateUniqueSlug(title);
    const now = Date.now();
    const publishedValue = isPublished === true;

    const blogData = {
      title: title.trim(),
      slug,
      excerpt: excerpt ? excerpt.trim() : "",
      content,
      coverImage: coverImage || "",
      author: author ? author.trim() : "Restaurant Signature",
      category: category || "Actualités",
      tags: Array.isArray(tags) ? tags : [],
      isPublished: publishedValue,
      publishedAt: publishedValue ? new Date(now) : null,
      createdAt: now,
      updatedAt: now
    };

    const blog = new Blog(blogData);
    await blog.save();

    console.log("✅ [POST] Article créé avec succès:", blog._id);
    res.status(201).json({ success: true, data: blog });

  } catch (err) {
    console.error("❌ [POST] Erreur création article:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Mettre à jour un article
router.put('/:id', async (req, res) => {
  console.log("📥 [PUT] Données reçues pour ID:", req.params.id);

  try {
    const { title, excerpt, content, coverImage, author, category, tags, isPublished } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: "Article non trouvé" });
    }

    // Si le titre change, régénérer le slug
    if (title && title.trim() !== blog.title) {
      blog.slug = await generateUniqueSlug(title, req.params.id);
      blog.title = title.trim();
    }

    if (excerpt !== undefined) blog.excerpt = excerpt.trim();
    if (content) blog.content = content;
    if (coverImage !== undefined) blog.coverImage = coverImage;
    if (author) blog.author = author.trim();
    if (category) blog.category = category;
    if (Array.isArray(tags)) blog.tags = tags;

    // Gestion de la publication
    if (isPublished === true && !blog.isPublished) {
      blog.isPublished = true;
      blog.publishedAt = new Date();
    } else if (isPublished === false) {
      blog.isPublished = false;
    }

    blog.updatedAt = Date.now();
    await blog.save();

    console.log("✅ [PUT] Article mis à jour:", blog._id);
    res.json({ success: true, data: blog });

  } catch (err) {
    console.error("❌ [PUT] Erreur mise à jour:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Publier / dépublier rapidement
router.patch('/:id/toggle-publish', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Article non trouvé" });
    }

    blog.isPublished = !blog.isPublished;
    if (blog.isPublished && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    blog.updatedAt = Date.now();
    await blog.save();

    console.log("✅ [PATCH] Statut de publication changé:", blog._id, "->", blog.isPublished);
    res.json({ success: true, data: blog });

  } catch (err) {
    console.error("❌ [PATCH] Erreur toggle-publish:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Supprimer un article
router.delete('/:id', async (req, res) => {
  console.log("📥 [DELETE] Suppression ID:", req.params.id);

  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Article non trouvé" });
    }

    console.log("✅ [DELETE] Article supprimé:", blog._id);
    res.json({ success: true, message: "Article supprimé" });

  } catch (err) {
    console.error("❌ [DELETE] Erreur suppression:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== PUBLIC (site du restaurant) ====================

// Liste des articles publiés (avec pagination + filtres optionnels)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const filter = { isPublished: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.tag) filter.tags = req.query.tag;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-content') // pas besoin du contenu complet dans la liste
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: blogs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Erreur GET /:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Détail d'un article publié via son slug (+1 vue)
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: "Article non trouvé" });
    }

    res.json({ success: true, data: blog });
  } catch (err) {
    console.error("Erreur GET /:slug:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
