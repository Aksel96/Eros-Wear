// lib/store.js · Lógica del catálogo con carrito y pedidos por WhatsApp
const db = require('../database/db');

const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 30;

/** Número de WhatsApp en formato internacional, solo dígitos (ej. 5215512345678). */
function getWhatsappNumber() {
    const digits = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
}

function formatMoney(n) {
    return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

/** Referencia legible del pedido, p. ej. EW-7K3Q9F */
function makeReference() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `EW-${out}`;
}

/**
 * Valida un carrito contra la base de datos (precio y stock reales).
 * items: [{ garmentId, size, qty }]
 * Devuelve líneas normalizadas, con avisos cuando se ajustó o no se pudo atender algo.
 */
async function validateCart(rawItems) {
    const items = (Array.isArray(rawItems) ? rawItems : []).slice(0, MAX_LINES).map(i => ({
        garmentId: parseInt(i.garmentId, 10),
        size: String(i.size || '').slice(0, 10),
        qty: Math.max(1, Math.min(MAX_QTY_PER_LINE, parseInt(i.qty, 10) || 1))
    })).filter(i => Number.isInteger(i.garmentId) && i.garmentId > 0);

    if (!items.length) return { lines: [], total: 0, count: 0, hasIssues: false };

    const ids = [...new Set(items.map(i => i.garmentId))];
    const [garments] = await db.query(
        `SELECT id, name, image_url, price, category FROM garments
         WHERE id IN (?) AND is_active = 1 AND category <> 'model'`, [ids]);
    const [sizes] = await db.query(
        'SELECT garment_id, size, stock FROM garment_sizes WHERE garment_id IN (?) ORDER BY sort_order', [ids]);

    const garmentMap = new Map(garments.map(g => [g.id, g]));
    const sizeMap = new Map();
    sizes.forEach(s => {
        if (!sizeMap.has(s.garment_id)) sizeMap.set(s.garment_id, []);
        sizeMap.get(s.garment_id).push({ size: s.size, stock: Number(s.stock) });
    });

    // Agrupa líneas repetidas (misma prenda y talla)
    const merged = new Map();
    items.forEach(i => {
        const key = `${i.garmentId}|${i.size}`;
        merged.set(key, { ...i, qty: Math.min(MAX_QTY_PER_LINE, (merged.get(key)?.qty || 0) + i.qty) });
    });

    const lines = [];
    let hasIssues = false;
    for (const item of merged.values()) {
        const g = garmentMap.get(item.garmentId);
        if (!g) { hasIssues = true; continue; } // prenda retirada: se omite
        const available = sizeMap.get(g.id) || [];
        const entry = available.find(s => s.size === item.size);
        const line = {
            garmentId: g.id,
            name: g.name,
            image: g.image_url,
            price: Number(g.price),
            sizes: available,
            size: item.size,
            qty: item.qty,
            stock: entry ? entry.stock : 0,
            issue: null
        };
        if (!entry) {
            line.issue = 'Elige una talla disponible.';
        } else if (entry.stock === 0) {
            line.issue = 'Talla agotada por el momento.';
        } else if (item.qty > entry.stock) {
            line.qty = entry.stock;
            line.issue = `Solo quedan ${entry.stock} en esta talla; ajustamos la cantidad.`;
        }
        if (line.issue) hasIssues = true;
        line.subtotal = line.price * line.qty;
        lines.push(line);
    }

    const payable = lines.filter(l => !l.issue || l.issue.startsWith('Solo quedan'));
    const total = payable.reduce((sum, l) => sum + l.subtotal, 0);
    const count = payable.reduce((sum, l) => sum + l.qty, 0);
    return { lines, total, count, hasIssues };
}

function buildWhatsappText({ reference, customerName, notes, lines, total }) {
    const rows = lines.map(l => `• ${l.name} · Talla ${l.size} · ${l.qty} x ${formatMoney(l.price)} = ${formatMoney(l.subtotal)}`);
    const parts = [
        `Hola, quiero hacer un pedido en Eros Wear (${reference}).`,
        '',
        ...rows,
        '',
        `Total: ${formatMoney(total)} MXN`,
        '',
        `Nombre: ${customerName}`
    ];
    if (notes) parts.push(`Notas: ${notes}`);
    return parts.join('\n');
}

function buildWhatsappUrl(text) {
    const number = getWhatsappNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

// Límite sencillo por IP para el envío de pedidos (en memoria).
const hits = new Map();
function rateLimit(key, max = 8, windowMs = 10 * 60 * 1000) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
}

module.exports = {
    getWhatsappNumber, formatMoney, makeReference, validateCart,
    buildWhatsappText, buildWhatsappUrl, rateLimit, MAX_QTY_PER_LINE
};
