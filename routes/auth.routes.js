// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.get('/register', authController.renderRegister);
router.post('/register', authController.register);

router.get('/login', authController.renderLogin);
router.post('/login', authController.login);

router.get('/logout', authController.logout);

module.exports = router;
