const express = require('express');
const router = express.Router();
const { getTables, createTable, deleteTable } = require('../controllers/tableController');

router.route('/')
    .get(getTables)
    .post(createTable);

router.route('/:id')
    .delete(deleteTable);

module.exports = router;