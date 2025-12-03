// controllers/index.controller.js
const db = require('../database/db');

const indexController = {};

const OpenAI = require('openai'); // Asegúrate de haber instalado 'openai'
// Inicializar el cliente de OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

indexController.renderTester = async (req, res) => {
    let conn;
    try {
        const user_id = req.session.user ? req.session.user.id : null;
        let garments = [];
        let query;

        if (user_id) {
            // Usuario logueado: OBTENER SOLO FAVORITOS
            query = `
                SELECT g.* FROM garments g
                JOIN user_favorites uf ON g.id = uf.garment_id
                WHERE uf.user_id = ? AND g.category != 'model'
            `;
            [garments] = await db.query(query, [user_id]);
        } else {
            // Usuario no logueado: Mostrar un catálogo vacío o solo el modelo (opcional)
            // Aquí elegimos mostrar solo un mensaje en el frontend
            garments = [];
        }

        res.render('tester', {
            title: 'Probador de Outfits',
            garments: garments, // Contendrá solo los favoritos (o vacío)
            user: req.session.user
        });

    } catch (error) {
        console.error('Error al cargar la página principal:', error);
        res.render('index', { error: 'Error al cargar el catálogo.' });
    }
};

// controllers/index.controller.js (MODIFICAR renderShop para filtros)

indexController.renderShop = async (req, res) => {
    const user_id = req.session.user ? req.session.user.id : null;
    // Capturar los parámetros de consulta de la URL (query string)
    const { category, sort_by } = req.query;

    try {
        // --- 1. Construcción Dinámica de la Consulta ---
        let whereClause = "WHERE g.category != 'model'";
        let orderClause = "ORDER BY g.category, g.name";
        let queryParams = [user_id];

        // 1.1 Filtro por Categoría
        if (category && category !== 'all') {
            whereClause += " AND g.category = ?";
            queryParams.push(category);
        }

        // 1.2 Ordenamiento
        if (sort_by === 'likes') {
            orderClause = "ORDER BY (SELECT COUNT(*) FROM user_favorites WHERE garment_id = g.id) DESC, g.name";
        } else if (sort_by === 'usage') {
            orderClause = "ORDER BY (SELECT COUNT(*) FROM outfit_items WHERE garment_id = g.id) DESC, g.name";
        } // Si es 'default' o no se especifica, usa el orden alfabético

        // --- 2. Consulta Final ---
        const [garments] = await db.query(`
            SELECT 
                g.id, g.name, g.category, g.image_url,
                CASE WHEN uf.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
                (SELECT COUNT(*) FROM user_favorites WHERE garment_id = g.id) AS total_favorites,
                (SELECT COUNT(*) FROM outfit_items WHERE garment_id = g.id) AS total_usage
            FROM garments g
            LEFT JOIN user_favorites uf ON g.id = uf.garment_id AND uf.user_id = ?
            ${whereClause}
            ${orderClause}
        `, queryParams);

        // --- 3. Agrupación (Solo para la vista, si se requiere) ---
        // Para los filtros, es mejor enviar la lista plana y procesarla en la vista.

        res.render('shop', {
            title: 'Eros Wear | Catálogo',
            user: req.session.user,
            garments: garments, // Enviamos la lista plana y filtrada

            // Parámetros para mantener el estado del filtro en la UI
            currentCategory: category || 'all',
            currentSort: sort_by || 'default'
        });
    } catch (error) {
        console.error('Error al cargar el catálogo de la tienda:', error);
        res.render('shop', { error: 'Error al cargar el catálogo de prendas' });
    }
};

indexController.removeFavoriteGarment = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { garment_id } = req.params;
    const user_id = req.session.user.id;

    try {
        const deleteQuery = `
            DELETE FROM user_favorites 
            WHERE user_id = ? AND garment_id = ?;
        `;
        const [result] = await db.query(deleteQuery, [user_id, garment_id]);

        if (result.affectedRows === 0) {
            // Esto sucede si el usuario intenta eliminar algo que ya no existe (un caso de carrera)
            return res.json({ success: true, action: 'removed', message: 'Prenda no encontrada, pero el catálogo está limpio' });
        }

        return res.json({ success: true, action: 'removed', message: 'Prenda eliminada de tu catálogo' });

    } catch (error) {
        console.error('Error al eliminar favorito:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};



// controllers/index.controller.js (AGREGAR addFavoriteGarment)

indexController.addFavoriteGarment = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { garment_id } = req.params;
    const user_id = req.session.user.id;
    let conn;

    try {
        // 1. Intentar insertar el favorito
        // ON DUPLICATE KEY UPDATE simplemente evita un error si el usuario ya lo tenía como favorito
        const insertQuery = `
            INSERT INTO user_favorites (user_id, garment_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE created_at = created_at;
        `;
        await db.query(insertQuery, [user_id, garment_id]);

        return res.json({ success: true, message: 'Prenda agregada a tu lista de creador' });

    } catch (error) {
        console.error('Error al agregar prenda favorita:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};




indexController.renderHome = async (req, res) => {
    let conn;
    try {
        // Consulta para obtener el TOP 5 de outfits por likes, incluyendo todos los items y el creador
        const [outfitsData] = await db.query(`
            SELECT 
                o.id AS outfit_id,
                o.name AS outfit_name,
                o.likes_count,
                u.nickname AS creator_nickname,
                oi.position_x,
                oi.position_y,
                g.image_url AS garment_image_url
            FROM outfits o
            JOIN users u ON o.user_id = u.id
            JOIN outfit_items oi ON o.id = oi.outfit_id
            JOIN garments g ON oi.garment_id = g.id
            ORDER BY o.likes_count DESC
            LIMIT 6
        `);

        // CONSULTA NUEVA: Obtener 6 prendas aleatorias (excluyendo el modelo)
        const [randomGarments] = await db.query(`
            SELECT id, name, image_url, category 
            FROM garments 
            WHERE category != 'model' 
            ORDER BY RAND() 
            LIMIT 6
        `);

        // Agrupar los items por outfit_id (lógica idéntica a renderGallery)
        const groupedOutfits = outfitsData.reduce((acc, row) => {
            if (!acc[row.outfit_id]) {
                acc[row.outfit_id] = {
                    id: row.outfit_id,
                    name: row.outfit_name,
                    likesCount: row.likes_count,
                    creator: row.creator_nickname,
                    items: []
                };
            }
            acc[row.outfit_id].items.push({
                image_url: row.garment_image_url,
                x: row.position_x,
                y: row.position_y
            });
            return acc;
        }, {});

        const topOutfits = Object.values(groupedOutfits);

        // 1. Renderizado Exitoso (Respuesta 1)
        res.render('home', {
            title: 'Eros Wear | Atrevimiento y Elegancia',
            user: req.session.user,
            topOutfits: topOutfits,
            randomGarments: randomGarments, // <-- PASAMOS LAS PRENDAS ALEATORIAS
            error: null
        });
        // Log de Sesión de Usuario (¡NUEVO!)
        if (req.session.user) {
            console.log(`[SESIÓN]: Usuario autenticado. Nombre: ${req.session.user.nickname}, Email: ${req.session.user.email}`);
        } else {
            console.log('[SESIÓN]: Usuario no autenticado. Invitado visitando el sitio.');
        }
         // <--- ¡LA SOLUCIÓN! TERMINA LA EJECUCIÓN AQUÍ.

    } catch (error) {
        // 2. Este catch ya no intentará enviar la respuesta si el renderizado anterior fue exitoso
        console.error('Error al cargar top outfits para Home:', error);

        // Sólo renderizamos el error si la respuesta aún no ha sido enviada
        if (!res.headersSent) {
            res.render('home', {
                error: 'Error al cargar los diseños destacados'
            });
        }
    } finally {
        if (conn) conn.release();
    }
};





/**
 * Renderiza la lista de usuarios registrados (Visitantes).
 */
indexController.renderVisitors = async (req, res) => {
    let conn;
    try {
        conn = await db.getConnection();

        // 1. Capturar el parámetro de ordenamiento
        const { sort_by } = req.query;

        // 2. Consulta SQL con Cálculo de Likes Totales
        // Utilizamos LEFT JOIN y SUM para contar los likes de todos los outfits de cada usuario.
        let query = `
            SELECT
                u.id,
                u.nickname,
                u.created_at,
                COALESCE(SUM(o.likes_count), 0) AS total_likes
            FROM users u
            LEFT JOIN outfits o ON u.id = o.user_id
            GROUP BY u.id, u.nickname, u.created_at
        `;

        // 3. Implementar la Cláusula de Ordenamiento
        let orderClause = "ORDER BY u.created_at DESC"; // Default: Más recientes

        if (sort_by === 'likes') {
            // Ordenar por total_likes (Descendente)
            orderClause = "ORDER BY total_likes DESC, u.created_at DESC";
        } else if (sort_by === 'newest') {
            orderClause = "ORDER BY u.created_at DESC";
        }

        query += orderClause;

        const [creatorsData] = await conn.query(query);

        res.render('visitors', {
            title: 'Nuestros Creadores',
            user: req.session.user,
            visitors: creatorsData, // Array de creadores con 'total_likes'
            currentSort: sort_by || 'newest'
        });

    } catch (error) {
        console.error('Error al cargar la lista de creadores:', error);
        res.render('visitors', { error: 'Error al cargar los creadores.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Función para obtener consejos de estilo del modelo GPT-4 mini.
 */
/**
 * Función para manejar la conversación general de estilo con el modelo GPT-4 mini.
 */
indexController.handleStyleChat = async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío.' });
    }

    // 1. Definir el System Prompt (Personalidad de la Marca)
    // Se enfatiza el conocimiento general de estilo, color y las tendencias de Eros Wear.
    const systemPrompt = `Eres el Asesor de Estilo AI de Eros Wear. Tu rol es guiar al usuario en combinaciones de ropa, teoría del color y consejos de moda. Eres una marca de diseño audaz, con corazón mexicano y enfocas tu estilo en fusionar elegancia clásica con street wear. Tu tono debe ser audaz, culto, directo y enfocarte en el estilo de Eros Wear. Mantén las respuestas en español y concisas.`;

    try {
        // 2. Llamar a la API de OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message } // Usamos el mensaje del usuario directamente
            ],
            max_tokens: 300,
        });

        const advice = response.choices[0].message.content;

        res.json({ success: true, advice: advice });

    } catch (error) {
        console.error('Error al llamar a la API de OpenAI:', error);
        res.status(500).json({ success: false, message: 'Fallo al conectar con el Asesor de Estilo AI. (Verifica tu API Key o saldo).' });
    }
};


module.exports = indexController;