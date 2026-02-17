const express = require('express');
const router = express.Router();
const { getAll, create, update, delete: deleteAcc } = require('../controllers/accompanimentController');

router.route('/')
  .get(getAll)
  .post(create);

router.route('/:id')
  .put(update)
  .delete(deleteAcc);

module.exports = router;