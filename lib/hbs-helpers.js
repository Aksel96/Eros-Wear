// lib/hbs-helpers.js · Helpers de Handlebars

const CATEGORY_LABELS = {
    top: 'Parte superior',
    bottom: 'Parte inferior',
    shoes: 'Calzado',
    accessory: 'Accesorio'
};


// Iconos SVG en línea (usar con triple llave: {{{icon 'heart'}}})
const ICONS = {
    heart: '<path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.4 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 5.9 3.9 4.5 7.3C19.5 16.4 12 21 12 21z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    layers: '<path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 16l10 6 10-6"/>',
    hanger: '<path d="M12 7a2 2 0 1 1 2-2c0 1.1-.9 1.5-2 2.3V9l9 6.5a1.5 1.5 0 0 1-.9 2.5H3.9a1.5 1.5 0 0 1-.9-2.5L12 9"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.4 4.5 5 4.8"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M10.5 20l1.8-8M12.3 12c-.6-2.4.6-4.5 2.5-4.5s2.7 1.6 2.2 3.6c-.5 2.2-2.2 3.6-3.8 3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    front: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'
};

module.exports = {
    icon(name, options) {
        const filled = options && options.hash && options.hash.filled;
        const body = ICONS[name] || '';
        return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    },
    json(context) {
        return JSON.stringify(context);
    },
    isOwner(userId, creatorId) {
        return Number(userId) === Number(creatorId);
    },
    eq(a, b) {
        return a === b;
    },
    startsWith(str, prefix) {
        return typeof str === 'string' && (str === prefix || (prefix !== '/' && str.startsWith(prefix)));
    },
    add(a, b) {
        return Number(a) + Number(b);
    },
    initial(text) {
        return text ? String(text).trim().charAt(0).toUpperCase() : '?';
    },
    categoryLabel(category) {
        return CATEGORY_LABELS[category] || category;
    },
    pad(n) {
        return String(n).padStart(2, '0');
    },
    dateFormat(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    memberSince(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
    }
};
