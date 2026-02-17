const express = require('express');
const router = express.Router();
const {
  createSupplement,
  getSupplements,
  updateSupplement,
  deleteSupplement
} = require('../controllers/supplementController');

router.route('/')
  .get(getSupplements)
  .post(createSupplement);

router.route('/:id')
  .put(updateSupplement)
  .delete(deleteSupplement);

module.exports = router;