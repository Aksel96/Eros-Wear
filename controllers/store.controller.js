// controllers/store.controller.js · Página de producto, carrito y pedidos
const db = require('../database/db');
const store = require('../lib/store');
const { groupOutfitRows } = require('../lib/outfits');

const storeController = {};

/** GET /product/:id */
storeController.renderProduct = async (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return next();
    try {
        const [rows] = await db.query(`
            SELECT g.id, g.name, g.category, g.image_url, g.price, g.description, g.material,
                   (SELECT COUNT(*) FROM user_favorites f WHERE f.garment_id = g.id) AS total_favorites,
                   (SELECT COUNT(*) FROM outfit_items i WHERE i.garment_id = g.id) AS total_usage
            FROM garments g
            WHERE g.id = ? AND g.is_active = 1 AND g.category <> 'model'
        `, [id]);
        if (!rows.length) return next();
        const garment = rows[0];

        const [sizes] = await db.query(
            'SELECT size, stock FROM garment_sizes WHERE garment_id = ? ORDER BY sort_order', [id]);
        garment.sizes = sizes.map(s => ({ size: s.size, stock: Number(s.stock), soldOut: Number(s.stock) === 0, low: Number(s.stock) > 0 && Number(s.stock) <= 2 }));
        garment.totalStock = garment.sizes.reduce((sum, s) => sum + s.stock, 0);

        const [related] = await db.query(`
            SELECT g.id, g.name, g.image_url, g.price, g.category,
                   (SELECT COALESCE(SUM(stock), 0) FROM garment_sizes s WHERE s.garment_id = g.id) AS total_stock
            FROM garments g
            WHERE g.category <> 'model' AND g.is_active = 1 AND g.id <> ?
            ORDER BY (g.category <> ?), RAND()
            LIMIT 4
        `, [id, garment.category]);

        const [outfitRows] = await db.query(`
            SELECT o.id AS outfit_id, o.name AS outfit_name, o.likes_count, o.created_at,
                   u.id AS creator_id, u.nickname AS creator_nickname,
                   oi.position_x, oi.position_y,
                   g.id AS garment_id, g.name AS garment_name, g.image_url AS garment_image_url
            FROM (SELECT DISTINCT outfit_id FROM outfit_items WHERE garment_id = ? LIMIT 3) pick
            JOIN outfits o       ON o.id = pick.outfit_id
            JOIN users u         ON u.id = o.user_id
            JOIN outfit_items oi ON oi.outfit_id = o.id
            JOIN garments g      ON g.id = oi.garment_id
            ORDER BY o.likes_count DESC, oi.id
        `, [id]);

        res.render('product', {
            title: garment.name,
            garment,
            related,
            outfits: groupOutfitRows(outfitRows),
            isProduct: true
        });
    } catch (err) {
        console.error('Error al cargar el producto:', err.message);
        next(err);
    }
};

/** POST /api/cart/validate · Revisa precios y stock reales del carrito. */
storeController.validate = async (req, res) => {
    try {
        const cart = await store.validateCart(req.body.items);
        res.json({ success: true, ...cart, whatsappEnabled: Boolean(store.getWhatsappNumber()) });
    } catch (err) {
        console.error('Error al validar el carrito:', err.message);
        res.status(500).json({ success: false, message: 'No pudimos revisar tu carrito.' });
    }
};

/** POST /api/orders · Registra el pedido y devuelve el enlace de WhatsApp. */
storeController.createOrder = async (req, res) => {
    if (!store.rateLimit(req.ip)) {
        return res.status(429).json({ success: false, message: 'Hiciste muchos pedidos seguidos. Intenta de nuevo en unos minutos.' });
    }

    const customerName = String(req.body.customerName || '').trim().slice(0, 100);
    const notes = String(req.body.notes || '').trim().slice(0, 500);
    if (customerName.length < 2) {
        return res.status(400).json({ success: false, message: 'Escribe tu nombre para enviar el pedido.' });
    }

    let conn;
    try {
        const cart = await store.validateCart(req.body.items);
        if (!cart.lines.length) {
            return res.status(400).json({ success: false, message: 'Tu carrito está vacío.' });
        }
        if (cart.hasIssues) {
            return res.status(409).json({
                success: false,
                message: 'Algunos artículos cambiaron de disponibilidad. Revisa tu carrito y vuelve a enviar.',
                cart: { ...cart, whatsappEnabled: Boolean(store.getWhatsappNumber()) }
            });
        }

        conn = await db.getConnection();
        await conn.beginTransaction();

        let reference;
        for (let attempt = 0; attempt < 5; attempt++) {
            reference = store.makeReference();
            const [taken] = await conn.query('SELECT id FROM orders WHERE reference = ?', [reference]);
            if (!taken.length) break;
        }

        const [result] = await conn.query(
            'INSERT INTO orders (reference, user_id, customer_name, notes, total) VALUES (?, ?, ?, ?, ?)',
            [reference, req.session.user ? req.session.user.id : null, customerName, notes || null, cart.total]
        );
        await conn.query(
            'INSERT INTO order_items (order_id, garment_id, name, size, quantity, unit_price) VALUES ?',
            [cart.lines.map(l => [result.insertId, l.garmentId, l.name, l.size, l.qty, l.price])]
        );
        await conn.commit();

        const text = store.buildWhatsappText({ reference, customerName, notes, lines: cart.lines, total: cart.total });
        res.json({
            success: true,
            reference,
            total: cart.total,
            whatsappUrl: store.buildWhatsappUrl(text),
            message: text
        });
    } catch (err) {
        if (conn) await conn.rollback().catch(() => {});
        console.error('Error al crear el pedido:', err.message);
        res.status(500).json({ success: false, message: 'No pudimos registrar tu pedido. Intenta de nuevo.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = storeController;
