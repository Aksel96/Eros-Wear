// controllers/index.controller.js
const db = require('../database/db');
const { groupOutfitRows } = require('../lib/outfits');

const indexController = {};

const CATEGORIES = ['top', 'bottom', 'shoes', 'accessory'];

/**
 * Inicio: hero, prendas en tendencia, outfits más populares y cifras de la comunidad.
 */
indexController.renderHome = async (req, res, next) => {
    try {
        const [outfitRows] = await db.query(`
            SELECT
                o.id AS outfit_id, o.name AS outfit_name, o.likes_count, o.created_at,
                u.id AS creator_id, u.nickname AS creator_nickname,
                oi.position_x, oi.position_y,
                g.id AS garment_id, g.name AS garment_name, g.image_url AS garment_image_url
            FROM (SELECT id FROM outfits ORDER BY likes_count DESC, created_at DESC LIMIT 6) top_o
            JOIN outfits o       ON o.id = top_o.id
            JOIN users u         ON u.id = o.user_id
            JOIN outfit_items oi ON oi.outfit_id = o.id
            JOIN garments g      ON g.id = oi.garment_id
            ORDER BY o.likes_count DESC, o.created_at DESC, oi.id
        `);

        const [trending] = await db.query(`
            SELECT id, name, image_url, category, price
            FROM garments
            WHERE category <> 'model' AND is_active = 1
            ORDER BY RAND()
            LIMIT 8
        `);

        const [[stats]] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM garments WHERE category <> 'model') AS garments,
                (SELECT COUNT(*) FROM outfits) AS outfits,
                (SELECT COUNT(*) FROM users) AS creators
        `);

        res.render('home', {
            title: 'Viste la audacia',
            isHome: true,
            topOutfits: groupOutfitRows(outfitRows),
            trending,
            stats
        });
    } catch (error) {
        console.error('Error al cargar el inicio:', error.message);
        res.render('home', {
            title: 'Viste la audacia',
            isHome: true,
            topOutfits: [],
            trending: [],
            dbError: true
        });
    }
};

/**
 * Catálogo con filtro por categoría, búsqueda y ordenamiento.
 */
indexController.renderShop = async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : 'all';
    const sortBy = ['likes', 'usage', 'price_asc', 'price_desc'].includes(req.query.sort_by) ? req.query.sort_by : 'default';
    const q = (req.query.q || '').trim().slice(0, 60);

    const where = ["g.category <> 'model'", 'g.is_active = 1'];
    const params = [userId];
    if (category !== 'all') {
        where.push('g.category = ?');
        params.push(category);
    }
    if (q) {
        where.push('g.name LIKE ?');
        params.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`);
    }

    const orderBy = {
        likes: 'total_favorites DESC, g.name',
        price_asc: 'g.price ASC, g.name',
        price_desc: 'g.price DESC, g.name',
        usage: 'total_usage DESC, g.name',
        default: 'g.name'
    }[sortBy];

    try {
        const [garments] = await db.query(`
            SELECT
                g.id, g.name, g.category, g.image_url, g.price,
                (SELECT COALESCE(SUM(stock), 0) FROM garment_sizes s WHERE s.garment_id = g.id) AS total_stock,
                CASE WHEN uf.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
                (SELECT COUNT(*) FROM user_favorites f WHERE f.garment_id = g.id) AS total_favorites,
                (SELECT COUNT(*) FROM outfit_items i WHERE i.garment_id = g.id) AS total_usage
            FROM garments g
            LEFT JOIN user_favorites uf ON uf.garment_id = g.id AND uf.user_id = ?
            WHERE ${where.join(' AND ')}
            ORDER BY ${orderBy}
        `, params);

        const [counts] = await db.query(`
            SELECT category, COUNT(*) AS total
            FROM garments WHERE category <> 'model'
            GROUP BY category
        `);
        const countMap = Object.fromEntries(counts.map(c => [c.category, Number(c.total)]));
        const totalAll = counts.reduce((sum, c) => sum + Number(c.total), 0);

        const filters = [
            { value: 'all', label: 'Todo', count: totalAll },
            { value: 'top', label: 'Parte superior', count: countMap.top || 0 },
            { value: 'bottom', label: 'Parte inferior', count: countMap.bottom || 0 },
            { value: 'shoes', label: 'Calzado', count: countMap.shoes || 0 }
        ];
        if (countMap.accessory) filters.push({ value: 'accessory', label: 'Accesorios', count: countMap.accessory });

        res.render('shop', {
            title: 'Catálogo',
            garments,
            filters,
            currentCategory: category,
            currentSort: sortBy,
            q,
            resultCount: garments.length
        });
    } catch (error) {
        console.error('Error al cargar el catálogo:', error.message);
        res.render('shop', { title: 'Catálogo', garments: [], filters: [], dbError: true });
    }
};

/**
 * Probador: muestra las prendas que el usuario agregó desde el catálogo.
 */
indexController.renderTester = async (req, res) => {
    if (!req.session.user) {
        return res.render('tester', { title: 'Probador', garments: [] });
    }
    try {
        const [garments] = await db.query(`
            SELECT g.id, g.name, g.category, g.image_url, g.price
            FROM garments g
            JOIN user_favorites uf ON uf.garment_id = g.id
            WHERE uf.user_id = ? AND g.category <> 'model'
            ORDER BY FIELD(g.category, 'top', 'bottom', 'shoes', 'accessory'), g.name
        `, [req.session.user.id]);

        res.render('tester', { title: 'Probador', garments, isStudio: true });
    } catch (error) {
        console.error('Error al cargar el probador:', error.message);
        res.render('tester', { title: 'Probador', garments: [], dbError: true });
    }
};

indexController.addFavoriteGarment = async (req, res) => {
    const garmentId = parseInt(req.params.garment_id, 10);
    if (!Number.isInteger(garmentId)) {
        return res.status(400).json({ success: false, message: 'Prenda inválida.' });
    }
    try {
        await db.query(`
            INSERT INTO user_favorites (user_id, garment_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE created_at = created_at
        `, [req.session.user.id, garmentId]);
        res.json({ success: true, message: 'Prenda agregada a tu probador.' });
    } catch (error) {
        console.error('Error al agregar favorito:', error.message);
        res.status(500).json({ success: false, message: 'No pudimos agregar la prenda.' });
    }
};

indexController.removeFavoriteGarment = async (req, res) => {
    const garmentId = parseInt(req.params.garment_id, 10);
    if (!Number.isInteger(garmentId)) {
        return res.status(400).json({ success: false, message: 'Prenda inválida.' });
    }
    try {
        await db.query(
            'DELETE FROM user_favorites WHERE user_id = ? AND garment_id = ?',
            [req.session.user.id, garmentId]
        );
        res.json({ success: true, message: 'Prenda quitada de tu probador.' });
    } catch (error) {
        console.error('Error al quitar favorito:', error.message);
        res.status(500).json({ success: false, message: 'No pudimos quitar la prenda.' });
    }
};

/**
 * Comunidad: creadores ordenados por recientes o por likes acumulados.
 */
indexController.renderVisitors = async (req, res) => {
    const sortBy = req.query.sort_by === 'likes' ? 'likes' : 'newest';
    const orderClause = sortBy === 'likes'
        ? 'ORDER BY total_likes DESC, u.created_at DESC'
        : 'ORDER BY u.created_at DESC';

    try {
        const [creators] = await db.query(`
            SELECT
                u.id, u.nickname, u.created_at,
                COALESCE(SUM(o.likes_count), 0) AS total_likes,
                COUNT(o.id) AS total_outfits
            FROM users u
            LEFT JOIN outfits o ON o.user_id = u.id
            GROUP BY u.id, u.nickname, u.created_at
            ${orderClause}
        `);

        res.render('visitors', { title: 'Comunidad', visitors: creators, currentSort: sortBy });
    } catch (error) {
        console.error('Error al cargar la comunidad:', error.message);
        res.render('visitors', { title: 'Comunidad', visitors: [], dbError: true });
    }
};

module.exports = indexController;
