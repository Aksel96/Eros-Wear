// lib/outfits.js · Utilidades compartidas para outfits

/**
 * Agrupa filas planas (outfit + item) en objetos outfit con su lista de prendas.
 * Mantiene el orden de aparición de los outfits.
 */
function groupOutfitRows(rows) {
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.outfit_id)) {
            map.set(row.outfit_id, {
                id: row.outfit_id,
                name: row.outfit_name,
                creator: row.creator_nickname,
                creatorId: row.creator_id,
                createdAt: row.created_at,
                likesCount: Number(row.likes_count) || 0,
                isLikedByUser: Number(row.user_liked) > 0,
                items: []
            });
        }
        map.get(row.outfit_id).items.push({
            garmentId: row.garment_id,
            name: row.garment_name,
            image_url: row.garment_image_url,
            x: Number(row.position_x),
            y: Number(row.position_y)
        });
    }
    return Array.from(map.values());
}

/** Valida y normaliza los items que llegan desde el probador. */
function sanitizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map(item => ({
            garmentId: parseInt(item.garmentId, 10),
            x: Number(item.x),
            y: Number(item.y)
        }))
        .filter(item => Number.isInteger(item.garmentId) && item.garmentId > 0
            && Number.isFinite(item.x) && Number.isFinite(item.y))
        .slice(0, 30)
        .map(item => ({
            ...item,
            x: Math.max(-2000, Math.min(5000, Math.round(item.x * 100) / 100)),
            y: Math.max(-2000, Math.min(5000, Math.round(item.y * 100) / 100))
        }));
}

module.exports = { groupOutfitRows, sanitizeItems };
