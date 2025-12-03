// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller'); // Lo crearemos en el paso 3

// Muestra el formulario de registro
router.get('/register', (req, res) => {
    // Renderiza la vista 'register' que crearemos en el paso 2
    res.render('register');
});

// Procesa los datos de registro (El controlador se encargará de esto después)
router.post('/register', authController.register);

// Muestra el formulario de login
router.get('/login', authController.renderLogin);

// Procesa el login
router.post('/login', authController.login);

// Logout
router.get('/logout', authController.logout);

module.exports = router;