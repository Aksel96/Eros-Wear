// controllers/outfit.controller.js

const db = require('../database/db');

const outfitController = {};

/**
 * Guarda el outfit y sus items en una transacción.
 * Recibe el cuerpo del request: { outfitName, items: [{ garmentId, x, y }, ...] }
 */
outfitController.saveOutfit = async (req, res) => {
    const { outfitName, items } = req.body;
    const userId = req.session.user.id; // Obtenido de la sesión

    if (!outfitName || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Faltan datos o el outfit está vacío.' });
    }

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction(); // Inicia la transacción

        // 1. Inserción en la tabla 'outfits' (Obtener el ID recién creado)
        const [outfitResult] = await conn.query(
            'INSERT INTO outfits (user_id, name) VALUES (?, ?)',
            [userId, outfitName]
        );
        const outfitId = outfitResult.insertId;

        // 2. Preparar los valores para la inserción de items
        const itemValues = items.map(item => [
            outfitId,
            item.garmentId,
            item.x,
            item.y
        ]);

        // 3. Inserción masiva en la tabla 'outfit_items'
        // NOTA: Esta sintaxis puede variar, pero '?' por array es común en mysql2
        await conn.query(
            'INSERT INTO outfit_items (outfit_id, garment_id, position_x, position_y) VALUES ?',
            [itemValues]
        );

        await conn.commit(); // Confirma la transacción si todo salió bien
        // Log de Creación de Outfit
        console.log(`[AUDITORÍA]: Outfit creado exitosamente. Nombre: ${outfitName}, ID: ${outfitId}, Creador ID: ${userId}`);

        res.json({ success: true, message: 'Outfit guardado exitosamente.', outfitId: outfitId });

    } catch (error) {
        if (conn) await conn.rollback(); // Deshace los cambios si hay error
        console.error('Error al guardar el outfit:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al guardar.' });
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Renderiza la galería social, mostrando los outfits de todos los usuarios.
 * Muestra el nombre del outfit, el creador y los detalles de las prendas.
 */

// controllers/outfit.controller.js (FUNCIÓN ACTUALIZADA)

outfitController.renderGallery = async (req, res) => {
    // ... (Inicialización y DEBUG) ...
    console.log('--- DEBUG DE SESIÓN ---');
    console.log('req.session.user al cargar galería:', req.session.user);
    console.log('--- FIN DEBUG ---');
    let conn;
    try {
        const loggedInUserId = req.session.user ? req.session.user.id : null;
        conn = await db.getConnection();
        const { sort_by } = req.query;

        let orderClause = "ORDER BY o.created_at DESC"; // Default: Más recientes

        if (sort_by === 'likes') {
            // Ordenar por likes, y en caso de empate, por fecha
            orderClause = "ORDER BY o.likes_count DESC, o.created_at DESC";
        } else if (sort_by === 'newest') {
            // Asegurar que si el parámetro es 'newest', se ordene por fecha (default)
            orderClause = "ORDER BY o.created_at DESC";
        }

        // --- Consulta Final ---
        const [outfitsData] = await db.query(`
            SELECT
                o.id AS outfit_id,
                o.name AS outfit_name,
                o.created_at,
                o.likes_count,
                u.nickname AS creator_nickname,
                u.id AS creator_id,
                (SELECT COUNT(*) FROM likes l WHERE l.outfit_id = o.id AND l.user_id = ?) AS user_liked,
                oi.position_x,
                oi.position_y,
                g.name AS garment_name,
                g.image_url AS garment_image_url
            FROM outfits o
                     JOIN users u ON o.user_id = u.id
                     JOIN outfit_items oi ON o.id = oi.outfit_id
                     JOIN garments g ON oi.garment_id = g.id
                ${orderClause}
        `, [loggedInUserId]); // Pass user_id for the user_liked check

        const groupedOutfits = outfitsData.reduce((acc, row) => {
            if (!acc[row.outfit_id]) {
                acc[row.outfit_id] = {
                    id: row.outfit_id,
                    name: row.outfit_name,
                    creator: row.creator_nickname,
                    creatorId: row.creator_id,
                    // Aseguramos que la fecha sea un objeto Date para la comparación en JS
                    createdAt: row.created_at,
                    likesCount: row.likes_count,
                    isLikedByUser: row.user_liked > 0,
                    items: []
                };
            }
            acc[row.outfit_id].items.push({
                name: row.garment_name,
                image_url: row.garment_image_url,
                x: row.position_x,
                y: row.position_y
            });
            return acc;
        }, {});

        // CONVERSIÓN Y ORDENAMIENTO EXPLÍCITO EN JAVASCRIPT (La Solución)
        const outfits = Object.values(groupedOutfits).sort((a, b) => {
            if (sort_by === 'likes') {
                // Ordenar por Likes (Descendente)
                if (a.likesCount !== b.likesCount) {
                    return b.likesCount - a.likesCount;
                }
                // Desempate por fecha (Más reciente primero)
                return new Date(b.createdAt) - new Date(a.createdAt);
            } else {
                // Default / Más Recientes: Ordenar por fecha (Descendente)
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        res.render('gallery', {
            title: 'Galería Social de Outfits',
            user: req.session.user,
            outfits: outfits,
            currentSort: sort_by || 'newest'
        });

    } catch (error) {
        console.error('Error al cargar la galería de outfits:', error);
        res.render('gallery', { error: 'Error al cargar los outfits.' });
    } finally {
        if (conn) conn.release();
    }
};



/**
 * Elimina un outfit si el usuario logueado es el creador.
 */
outfitController.deleteOutfit = async (req, res) => {
    const outfitId = req.params.id;
    const userId = req.session.user.id;

    let conn;
    try {
        conn = await db.getConnection();

        // 1. Verificar que el outfit existe y pertenece al usuario (Seguridad)
        const [outfits] = await conn.query(
            'SELECT user_id FROM outfits WHERE id = ? AND user_id = ?',
            [outfitId, userId]
        );

        if (outfits.length === 0) {
            req.flash('error_msg', 'No tienes permiso para eliminar este outfit o no existe.');
            return res.redirect('/gallery');
        }

        // 2. Eliminar el outfit. (ON DELETE CASCADE en la BD elimina los outfit_items)
        await conn.query('DELETE FROM outfits WHERE id = ?', [outfitId]);

        req.flash('success_msg', 'Outfit eliminado exitosamente.');
        res.redirect('/gallery');

    } catch (error) {
        console.error('Error al eliminar outfit:', error);
        req.flash('error_msg', 'Error al eliminar el outfit.');
        res.redirect('/gallery');
    } finally {
        if (conn) conn.release();
    }
};

outfitController.incrementLike = async (req, res) => {
    const outfitId = req.params.id;

    let conn;
    try {
        conn = await db.getConnection();

        // 1. Incrementar el contador directamente
        await conn.query(
            'UPDATE outfits SET likes_count = likes_count + 1 WHERE id = ?',
            [outfitId]
        );

        // 2. Obtener el nuevo conteo para actualizar el frontend
        const [newCountResult] = await conn.query('SELECT likes_count FROM outfits WHERE id = ?', [outfitId]);
        const newCount = newCountResult[0]?.likes_count || 0;

        res.json({
            success: true,
            newCount: newCount,
            message: 'Like incrementado.'
        });

    } catch (error) {
        console.error('Error al incrementar like:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// controllers/outfit.controller.js (AGREGAR)

/**
 * Obtiene un outfit específico y sus items para cargarlo en el editor.
 */
outfitController.getOutfitById = async (req, res) => {
    const outfitId = req.params.id;
    let conn;
    try {
        conn = await db.getConnection();

        // Consulta para obtener el outfit y todos sus items.
        const [outfitData] = await conn.query(`
            SELECT 
                o.name AS outfit_name,
                o.user_id,
                oi.position_x,
                oi.position_y,
                g.id AS garment_id,
                g.image_url AS garment_image_url
            FROM outfits o
            JOIN outfit_items oi ON o.id = oi.outfit_id
            JOIN garments g ON oi.garment_id = g.id
            WHERE o.id = ?
        `, [outfitId]);

        if (outfitData.length === 0) {
            return res.status(404).json({ success: false, message: 'Outfit no encontrado.' });
        }

        // Formatear los datos para el frontend
        const items = outfitData.map(row => ({
            garmentId: row.garment_id,
            imageUrl: row.garment_image_url,
            x: row.position_x,
            y: row.position_y
        }));

        res.json({
            success: true,
            name: outfitData[0].outfit_name,
            userId: outfitData[0].user_id, // Para que el frontend verifique si es el dueño
            items
        });

    } catch (error) {
        console.error('Error al obtener outfit por ID:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};


// controllers/outfit.controller.js (AGREGAR)

/**
 * Actualiza un outfit existente (sobrescribe items y coordenadas).
 */
outfitController.updateOutfit = async (req, res) => {
    const outfitId = req.params.id;
    const userId = req.session.user.id; // Obtenido del usuario logueado
    const { outfitName, items } = req.body;

    if (!outfitName || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Faltan datos o el outfit está vacío.' });
    }

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        // 1. Verificar si el usuario es el dueño antes de modificar (SEGURIDAD)
        const [ownerCheck] = await conn.query('SELECT user_id FROM outfits WHERE id = ?', [outfitId]);
        if (ownerCheck.length === 0 || ownerCheck[0].user_id !== userId) {
            await conn.rollback();
            return res.status(403).json({ success: false, message: 'No tienes permiso para modificar este outfit.' });
        }

        // 2. Eliminar todos los items viejos del outfit (LIMPIEZA)
        await conn.query('DELETE FROM outfit_items WHERE outfit_id = ?', [outfitId]);

        // 3. Actualizar el nombre del outfit (UPDATE)
        await conn.query('UPDATE outfits SET name = ? WHERE id = ?', [outfitName, outfitId]);

        // 4. Insertar los nuevos items (CREATE/REPLACE)
        const itemValues = items.map(item => [
            outfitId,
            item.garmentId,
            item.x,
            item.y
        ]);
        await conn.query('INSERT INTO outfit_items (outfit_id, garment_id, position_x, position_y) VALUES ?', [itemValues]);

        await conn.commit();
        res.json({ success: true, message: 'Outfit actualizado exitosamente.' });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Error al actualizar outfit:', error);
        res.status(500).json({ success: false, message: 'Error interno al actualizar.' });
    } finally {
        if (conn) conn.release();
    }
};



module.exports = outfitController;