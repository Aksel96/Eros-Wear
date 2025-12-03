// Ejemplo: routes/index.routes.js

const express = require('express');
const router = express.Router();
const indexController = require('../controllers/index.controller');
const outfitController = require('../controllers/outfit.controller'); // Nuevo controlador

// routes/index.routes.js (AGREGAR)

const { isLoggedIn } = require('../controllers/auth.controller'); // Necesaria para proteger la actualización

// RUTA RAIZ (HOME)
router.get('/', indexController.renderHome); // <-- CAMBIAR A renderHome

// RUTA DEL PROBADOR/CANVAS (Ya no es el Home, necesita sus propios datos)
router.get('/tester', indexController.renderTester);

// Ruta del Catálogo de la Tienda
router.get('/shop', indexController.renderShop);

// 1. Ruta para obtener los datos de un outfit por ID (Cargar al Canvas)
router.get('/outfits/:id', outfitController.getOutfitById);

// 2. Ruta para actualizar (sobrescribir) un outfit existente
router.put('/outfits/:id', isLoggedIn, outfitController.updateOutfit);


// Lista de Visitantes (Nueva página)
router.get('/visitors', indexController.renderVisitors);

// Ruta para agregar una prenda a favoritos del usuario
router.post('/shop/favorite/:garment_id', isLoggedIn, indexController.addFavoriteGarment);

// Controlador para la API de estilo
router.post('/api/style-advice', isLoggedIn, indexController.handleStyleChat); // Asegúrate de que apunte al nombre correcto

// Ruta para eliminar una prenda de favoritos del usuario
router.post('/shop/unfavorite/:garment_id', isLoggedIn, indexController.removeFavoriteGarment);

// Ruta de guardado protegida
router.post('/outfits', isLoggedIn, outfitController.saveOutfit);

// Ruta para ver la galería (la crearemos más adelante)
router.get('/gallery', outfitController.renderGallery);

router.post('/outfits/delete/:id', isLoggedIn, outfitController.deleteOutfit);

router.post('/outfits/:id/like', outfitController.incrementLike);

module.exports = router; // 👈 ¡CLAVE! Exportar el objeto router