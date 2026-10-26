const express = require('express');
const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const petRoutes = require('./petRoutes');
const journalRoutes = require('./journalRoutes');

const router = express.Router();

router.use('/', homeRoutes);
router.use('/', authRoutes);
router.use('/', adminRoutes);
router.use('/', petRoutes);
router.use('/', journalRoutes);

module.exports = router;
