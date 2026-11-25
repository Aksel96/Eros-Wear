// controllers/outfit.controller.js
const db = require('../database/db');
const { groupOutfitRows, sanitizeItems } = require('../lib/outfits');

const outfitController = {};

function validateOutfitBody(body) {
    const name = (body.outfitName || '').trim().slice(0, 100);
    const items = sanitizeItems(body.items);
    if (!name) return { error: 'Ponle un nombre a tu outfit.' };
    if (items.length === 0) return { error: 'Tu lienzo está vacío.' };
    return { name, items };
}

/** POST /outfits · Guarda un outfit nuevo con sus prendas. */
outfitController.saveOutfit = async (req, res) => {
    const { name, items, error } = validateOutfitBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        const [result] = await conn.query(
            'INSERT INTO outfits (user_id, name) VALUES (?, ?)',
            [req.session.user.id, name]
        );
        const outfitId = result.insertId;

        await conn.query(
            'INSERT INTO outfit_items (outfit_id, garment_id, position_x, position_y) VALUES ?',
            [items.map(i => [outfitId, i.garmentId, i.x, i.y])]
        );

        await conn.commit();
        res.json({ success: true, message: 'Outfit guardado en la galería.', outfitId });
    } catch (err) {
        if (conn) await conn.rollback().catch(() => {});
        console.error('Error al guardar el outfit:', err.message);
        res.status(500).json({ success: false, message: 'No pudimos guardar el outfit.' });
    } finally {
        if (conn) conn.release();
    }
};

/** PUT /outfits/:id · Sobrescribe nombre y prendas de un outfit propio. */
outfitController.updateOutfit = async (req, res) => {
    const outfitId = parseInt(req.params.id, 10);
    const { name, items, error } = validateOutfitBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        const [owner] = await conn.query('SELECT user_id FROM outfits WHERE id = ? FOR UPDATE', [outfitId]);
        if (owner.length === 0 || owner[0].user_id !== req.session.user.id) {
            await conn.rollback();
            return res.status(403).json({ success: false, message: 'No puedes modificar este outfit.' });
        }

        await conn.query('DELETE FROM outfit_items WHERE outfit_id = ?', [outfitId]);
        await conn.query('UPDATE outfits SET name = ? WHERE id = ?', [name, outfitId]);
        await conn.query(
            'INSERT INTO outfit_items (outfit_id, garment_id, position_x, position_y) VALUES ?',
            [items.map(i => [outfitId, i.garmentId, i.x, i.y])]
        );

        await conn.commit();
        res.json({ success: true, message: 'Outfit actualizado.', outfitId });
    } catch (err) {
        if (conn) await conn.rollback().catch(() => {});
        console.error('Error al actualizar el outfit:', err.message);
        res.status(500).json({ success: false, message: 'No pudimos actualizar el outfit.' });
    } finally {
        if (conn) conn.release();
    }
};

/** GET /outfits/:id · Datos de un outfit para cargarlo en el probador. */
outfitController.getOutfitById = async (req, res) => {
    const outfitId = parseInt(req.params.id, 10);
    try {
        const [rows] = await db.query(`
            SELECT o.name AS outfit_name, o.user_id,
                   oi.position_x, oi.position_y,
                   g.id AS garment_id, g.name AS garment_name, g.image_url AS garment_image_url
            FROM outfits o
            JOIN outfit_items oi ON oi.outfit_id = o.id
            JOIN garments g      ON g.id = oi.garment_id
            WHERE o.id = ?
            ORDER BY oi.id
        `, [outfitId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Outfit no encontrado.' });
        }

        res.json({
            success: true,
            name: rows[0].outfit_name,
            userId: rows[0].user_id,
            items: rows.map(r => ({
                garmentId: r.garment_id,
                name: r.garment_name,
                imageUrl: r.garment_image_url,
                x: Number(r.position_x),
                y: Number(r.position_y)
            }))
        });
    } catch (err) {
        console.error('Error al obtener outfit:', err.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

/** GET /gallery · Galería de outfits de toda la comunidad. */
outfitController.renderGallery = async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    const sortBy = req.query.sort_by === 'likes' ? 'likes' : 'newest';
    const mine = req.query.mine === '1' && userId;
    const orderClause = sortBy === 'likes'
        ? 'o.likes_count DESC, o.created_at DESC'
        : 'o.created_at DESC';

    try {
        const [rows] = await db.query(`
            SELECT
                o.id AS outfit_id, o.name AS outfit_name, o.created_at, o.likes_count,
                u.nickname AS creator_nickname, u.id AS creator_id,
                (SELECT COUNT(*) FROM likes l WHERE l.outfit_id = o.id AND l.user_id = ?) AS user_liked,
                oi.position_x, oi.position_y,
                g.name AS garment_name, g.image_url AS garment_image_url
            FROM outfits o
            JOIN users u         ON u.id = o.user_id
            JOIN outfit_items oi ON oi.outfit_id = o.id
            JOIN garments g      ON g.id = oi.garment_id
            ${mine ? 'WHERE o.user_id = ?' : ''}
            ORDER BY ${orderClause}, oi.id
        `, mine ? [userId, userId] : [userId]);

        res.render('gallery', {
            title: 'Galería',
            outfits: groupOutfitRows(rows),
            currentSort: sortBy,
            mine: Boolean(mine)
        });
    } catch (err) {
        console.error('Error al cargar la galería:', err.message);
        res.render('gallery', { title: 'Galería', outfits: [], dbError: true });
    }
};

/** POST /outfits/delete/:id · Elimina un outfit propio. */
outfitController.deleteOutfit = async (req, res) => {
    const outfitId = parseInt(req.params.id, 10);
    try {
        const [result] = await db.query(
            'DELETE FROM outfits WHERE id = ? AND user_id = ?',
            [outfitId, req.session.user.id]
        );
        if (result.affectedRows === 0) {
            req.flash('error_msg', 'No puedes eliminar este outfit o ya no existe.');
        } else {
            req.flash('success_msg', 'Outfit eliminado.');
        }
    } catch (err) {
        console.error('Error al eliminar outfit:', err.message);
        req.flash('error_msg', 'No pudimos eliminar el outfit.');
    }
    res.redirect('/gallery');
};

/** POST /outfits/:id/like · Da o quita like (uno por usuario). */
outfitController.toggleLike = async (req, res) => {
    const outfitId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        const [exists] = await conn.query('SELECT id FROM outfits WHERE id = ? FOR UPDATE', [outfitId]);
        if (exists.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Outfit no encontrado.' });
        }

        const [removed] = await conn.query(
            'DELETE FROM likes WHERE user_id = ? AND outfit_id = ?',
            [userId, outfitId]
        );

        let liked;
        if (removed.affectedRows > 0) {
            liked = false;
            await conn.query(
                'UPDATE outfits SET likes_count = GREATEST(likes_count, 1) - 1 WHERE id = ?',
                [outfitId]
            );
        } else {
            liked = true;
            await conn.query('INSERT INTO likes (user_id, outfit_id) VALUES (?, ?)', [userId, outfitId]);
            await conn.query('UPDATE outfits SET likes_count = likes_count + 1 WHERE id = ?', [outfitId]);
        }

        const [[{ likes_count }]] = await conn.query('SELECT likes_count FROM outfits WHERE id = ?', [outfitId]);
        await conn.commit();

        res.json({ success: true, liked, newCount: Number(likes_count) });
    } catch (err) {
        if (conn) await conn.rollback().catch(() => {});
        console.error('Error al procesar like:', err.message);
        res.status(500).json({ success: false, message: 'No pudimos registrar tu like.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = outfitController;
