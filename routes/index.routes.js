// routes/index.routes.js
const express = require('express');
const router = express.Router();
const indexController = require('../controllers/index.controller');
const outfitController = require('../controllers/outfit.controller');
const storeController = require('../controllers/store.controller');
const { isLoggedIn } = require('../controllers/auth.controller');

// Verificación de salud para el hosting (no toca la base de datos)
router.get('/healthz', (req, res) => res.json({ ok: true }));

// Páginas
router.get('/', indexController.renderHome);
router.get('/shop', indexController.renderShop);
router.get('/product/:id', storeController.renderProduct);
router.get('/tester', indexController.renderTester);
router.get('/gallery', outfitController.renderGallery);
router.get('/visitors', indexController.renderVisitors);

// Carrito y pedidos (por WhatsApp)
router.post('/api/cart/validate', storeController.validate);
router.post('/api/orders', storeController.createOrder);

// Prendas del probador (favoritos)
router.post('/shop/favorite/:garment_id', isLoggedIn, indexController.addFavoriteGarment);
router.post('/shop/unfavorite/:garment_id', isLoggedIn, indexController.removeFavoriteGarment);

// Outfits
router.post('/outfits', isLoggedIn, outfitController.saveOutfit);
router.get('/outfits/:id', outfitController.getOutfitById);
router.put('/outfits/:id', isLoggedIn, outfitController.updateOutfit);
router.post('/outfits/delete/:id', isLoggedIn, outfitController.deleteOutfit);
router.post('/outfits/:id/like', isLoggedIn, outfitController.toggleLike);

module.exports = router;
