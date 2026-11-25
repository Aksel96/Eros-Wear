-- =====================================================================
-- Eros Wear · Datos iniciales
-- Catálogo completo de prendas + cuenta de la marca con outfits de muestra.
-- La cuenta 'ErosStudio' tiene una contraseña aleatoria que se descartó:
-- nadie puede iniciar sesión con ella.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO garments (id, name, category, image_url) VALUES
    (1, 'Acacia Resilient', 'bottom', '/img/garments/Acacia Resilient.png'),
    (2, 'Alder Shadowy', 'bottom', '/img/garments/Alder Shadowy.png'),
    (3, 'Anise Blaze', 'shoes', '/img/garments/Anise Blaze.png'),
    (4, 'Bamboo Aromatic', 'top', '/img/garments/Bamboo Aromatic.png'),
    (5, 'Black and White Geometric', 'bottom', '/img/garments/Black and White Geometric.png'),
    (6, 'Bloom Dead', 'top', '/img/garments/Bloom Dead.png'),
    (7, 'Cherry Blossom', 'bottom', '/img/garments/Cherry Blossom.png'),
    (8, 'Cigar Flossy', 'top', '/img/garments/Cigar Flossy.png'),
    (9, 'Cinnamon Radiant', 'shoes', '/img/garments/Cinnnamol Radiant.png'),
    (10, 'Clover Lucky', 'bottom', '/img/garments/Clover Lucky.png'),
    (11, 'Coleus Soft', 'bottom', '/img/garments/Coleus Soft.png'),
    (12, 'Cosmos Serene', 'top', '/img/garments/Cosmos Serene.png'),
    (13, 'Cream Graceful', 'bottom', '/img/garments/Cream Graceful.png'),
    (14, 'Cypress Neat', 'bottom', '/img/garments/Cypress Neat.png'),
    (15, 'Dahlia Urbane', 'top', '/img/garments/Dahlia Urbane.png'),
    (16, 'Darkness Sky', 'bottom', '/img/garments/Darkness Sky.png'),
    (17, 'Desert Broken', 'bottom', '/img/garments/Desert Broken.png'),
    (18, 'Dracaena Finder', 'bottom', '/img/garments/Dracaena Finder.png'),
    (19, 'Elm Nifty', 'bottom', '/img/garments/Elm Nifty.png'),
    (20, 'Enoki Flame', 'shoes', '/img/garments/Enoki Flame.png'),
    (21, 'Ginger Spicy', 'shoes', '/img/garments/Ginger Spicy.png'),
    (22, 'Iris Charming', 'top', '/img/garments/Iris Charming.png'),
    (23, 'Irish Bijou', 'shoes', '/img/garments/Irish Bijou.png'),
    (24, 'Ironwood Nutty', 'bottom', '/img/garments/Ironwood Nutty.png'),
    (25, 'Ivy Climbing', 'bottom', '/img/garments/Ivy Climbing.png'),
    (26, 'Juniper Delicate', 'top', '/img/garments/Juniper Delicate.png'),
    (27, 'Leaf Serene', 'top', '/img/garments/Leaft Serene.png'),
    (28, 'Lemon Citrusy', 'bottom', '/img/garments/Lemon Citrusy.png'),
    (29, 'Lilac Soft', 'top', '/img/garments/Lilac Soft.png'),
    (30, 'Lily Elegant', 'top', '/img/garments/Lily Elegant.png'),
    (31, 'Lily Pure', 'top', '/img/garments/Lily Pure.png'),
    (32, 'Linden Clair', 'shoes', '/img/garments/Linden Clair.png'),
    (33, 'Locust Trim', 'bottom', '/img/garments/Locust Trim.png'),
    (34, 'Lotus Classy', 'top', '/img/garments/Lottus Classy.png'),
    (35, 'Lotus Sacred', 'top', '/img/garments/Lotus Sacred.png'),
    (36, 'Mali Rude', 'top', '/img/garments/Mali Rude.png'),
    (37, 'Mint Explosive', 'bottom', '/img/garments/Mint Explosive.png'),
    (38, 'Moss Robust', 'bottom', '/img/garments/Moss Robust.png'),
    (39, 'Nettle Rect', 'bottom', '/img/garments/Nettle Rect.png'),
    (40, 'Oak Silk', 'top', '/img/garments/Oak Silk.png'),
    (41, 'Palm Tropical', 'bottom', '/img/garments/Palm Tropical.png'),
    (42, 'Peach Sunrise', 'top', '/img/garments/Peach Sunrise.png'),
    (43, 'Poppy Bold', 'top', '/img/garments/Poppy Bold.png'),
    (44, 'Rice Insolent', 'top', '/img/garments/Rice Insolent.png'),
    (45, 'Rosemary Rustic', 'shoes', '/img/garments/Rosemary Rustic.png'),
    (46, 'Rowan Mystical', 'bottom', '/img/garments/Rowan Mystical.png'),
    (47, 'Rubber Vibrant', 'bottom', '/img/garments/Rubber Vibrant.png'),
    (48, 'Sage Earthy', 'bottom', '/img/garments/Sage Earthy.png'),
    (49, 'Saki Dapper', 'top', '/img/garments/Saki Dapper.png'),
    (50, 'Sesame White', 'shoes', '/img/garments/Sesame White.png'),
    (51, 'Teak Smooth', 'bottom', '/img/garments/Teak Smooth.png'),
    (52, 'Tulip Vibrant', 'top', '/img/garments/Tulip Vibrant.png'),
    (53, 'Vanilla Spectre', 'top', '/img/garments/Vanilla Spectre.png'),
    (54, 'Walnut Odd', 'top', '/img/garments/Walnut Odd.png'),
    (55, 'Wine Attribute', 'top', '/img/garments/Wine Attribute.png'),
    (56, 'Zinnia Bold', 'top', '/img/garments/Zinnia Bold.png'),
    (57, 'Zinnia Wild', 'top', '/img/garments/Zinnia Wild.png'),
    (58, 'Amethyst Rebel', 'top', '/img/garments/chaqueta-morada.png'),
    (59, 'Modelo Base', 'model', '/img/garments/modelo-base.png');

INSERT INTO users (id, nickname, email, password_hash) VALUES
    (1, 'ErosStudio', 'studio@eroswear.invalid', '$2b$10$XvJq.tlYtw5rad590T8hD.D1zt8PHmf8tCrSJI1oI24Ln131Ff7bm');

INSERT INTO outfits (id, user_id, name, likes_count, created_at) VALUES
    (1, 1, 'Noche Amatista', 128, NOW() - INTERVAL 1 DAY),
    (2, 1, 'Sastre Rebelde', 96, NOW() - INTERVAL 4 DAY),
    (3, 1, 'Invierno Urbano', 84, NOW() - INTERVAL 7 DAY),
    (4, 1, 'Rosa Insurgente', 71, NOW() - INTERVAL 10 DAY),
    (5, 1, 'Lienzo Neutro', 57, NOW() - INTERVAL 13 DAY),
    (6, 1, 'Tartán y Terciopelo', 43, NOW() - INTERVAL 16 DAY);

INSERT INTO outfit_items (outfit_id, garment_id, position_x, position_y) VALUES
    (1, 58, 185.00, 20.00),
    (1, 16, 185.00, 147.35),
    (1, 23, 185.00, 412.59),
    (2, 8, 185.00, 20.00),
    (2, 33, 185.00, 160.88),
    (2, 20, 185.00, 507.26),
    (3, 22, 185.00, 20.00),
    (3, 1, 185.00, 131.43),
    (3, 9, 185.00, 346.33),
    (4, 42, 185.00, 20.00),
    (4, 51, 185.00, 138.53),
    (4, 45, 185.00, 377.30),
    (5, 31, 185.00, 20.00),
    (5, 24, 185.00, 201.04),
    (5, 32, 185.00, 416.82),
    (6, 56, 185.00, 20.00),
    (6, 47, 185.00, 166.02),
    (6, 9, 185.00, 257.28);
