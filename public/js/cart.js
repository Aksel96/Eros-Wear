// public/js/cart.js · Carrito de Eros Wear (se guarda en el navegador; el servidor valida precios y stock)
(function () {
    'use strict';

    const KEY = 'eros_cart_v1';
    const MAX_QTY = 10;
    const money = n => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ------------------------------------------------------------------
    // Almacenamiento
    // ------------------------------------------------------------------
    function read() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (_) { return []; }
    }
    function write(items) {
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) { /* modo privado */ }
        updateBadge(items.reduce((n, i) => n + i.qty, 0));
    }
    function updateBadge(count) {
        document.querySelectorAll('.cart-count').forEach(el => {
            const changed = el.textContent !== String(count);
            el.textContent = count;
            el.classList.toggle('is-hidden', count === 0);
            if (changed && count > 0) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
        });
    }

    let state = { lines: [], total: 0, count: 0, hasIssues: false, whatsappEnabled: true };
    let view = 'cart'; // 'cart' | 'done'
    let lastOrder = null;

    // ------------------------------------------------------------------
    // API del carrito
    // ------------------------------------------------------------------
    function add(garmentId, size = '', qty = 1) {
        const items = read();
        const found = items.find(i => i.garmentId === garmentId && i.size === size);
        if (found) found.qty = Math.min(MAX_QTY, found.qty + qty);
        else items.push({ garmentId, size, qty });
        write(items);
    }

    function pickDefaultSize(sizes) {
        const available = (sizes || []).filter(s => s.stock > 0);
        if (!available.length) return '';
        const preferred = available.find(s => s.size === 'M' || s.size === '27');
        return (preferred || available[Math.floor((available.length - 1) / 2)]).size;
    }

    async function refresh() {
        const items = read();
        if (!items.length) {
            state = { ...state, lines: [], total: 0, count: 0, hasIssues: false };
            render();
            return;
        }
        setLoading(true);
        try {
            const data = await ErosUI.request('/api/cart/validate', { body: { items } });
            // Elige talla automáticamente cuando falta y ajusta cantidades
            data.lines.forEach(l => {
                if (!l.size) {
                    l.size = pickDefaultSize(l.sizes);
                    const entry = l.sizes.find(s => s.size === l.size);
                    l.stock = entry ? entry.stock : 0;
                    l.issue = l.size ? null : 'Sin tallas disponibles.';
                }
            });
            state = data;
            write(data.lines.filter(l => l.size).map(l => ({ garmentId: l.garmentId, size: l.size, qty: l.qty })));
            // Recalcula total con las tallas autoseleccionadas
            state.total = data.lines.filter(l => !l.issue || l.issue.startsWith('Solo quedan')).reduce((s, l) => s + l.price * l.qty, 0);
        } catch (err) {
            if (err.message !== 'unauthorized') ErosUI.toast('No pudimos actualizar tu carrito.', 'error');
        } finally {
            setLoading(false);
            render();
        }
    }

    function setLoading(on) {
        const body = document.getElementById('cartBody');
        if (body) body.classList.toggle('is-loading', on);
    }

    // ------------------------------------------------------------------
    // Interfaz
    // ------------------------------------------------------------------
    function lineHtml(l, idx) {
        const options = l.sizes.map(s =>
            `<option value="${esc(s.size)}" ${s.size === l.size ? 'selected' : ''} ${s.stock === 0 ? 'disabled' : ''}>${esc(s.size)}${s.stock === 0 ? ' (agotada)' : ''}</option>`).join('');
        return `
        <li class="cart-line ${l.issue && !l.issue.startsWith('Solo quedan') ? 'has-issue' : ''}" data-idx="${idx}">
            <a href="/product/${l.garmentId}" class="cart-thumb"><img src="${esc(l.image)}" alt="" loading="lazy"></a>
            <div class="cart-info">
                <a href="/product/${l.garmentId}" class="cart-name">${esc(l.name)}</a>
                <div class="cart-controls">
                    <select class="select select-sm cart-size" style="width:auto" aria-label="Talla de ${esc(l.name)}">${options}</select>
                    <div class="qty" role="group" aria-label="Cantidad">
                        <button type="button" data-act="dec" aria-label="Menos">&minus;</button>
                        <span>${l.qty}</span>
                        <button type="button" data-act="inc" aria-label="Más" ${l.qty >= Math.min(l.stock, MAX_QTY) ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                ${l.issue ? `<p class="cart-issue">${esc(l.issue)}</p>` : (l.stock > 0 && l.stock <= 2 ? `<p class="cart-low">Últimas ${l.stock} piezas</p>` : '')}
            </div>
            <div class="cart-price">
                <strong>${money(l.price * l.qty)}</strong>
                <button type="button" class="cart-remove" data-act="remove" aria-label="Quitar ${esc(l.name)}">Quitar</button>
            </div>
        </li>`;
    }

    function render() {
        const body = document.getElementById('cartBody');
        const footer = document.getElementById('cartFooter');
        if (!body || !footer) return;
        updateBadge(read().reduce((n, i) => n + i.qty, 0));

        if (view === 'done' && lastOrder) {
            footer.classList.add('is-hidden');
            body.innerHTML = `
                <div class="cart-done">
                    <div class="empty-icon">${checkIcon()}</div>
                    <h3>¡Pedido registrado!</h3>
                    <p class="mb-1">Tu referencia es <strong>${esc(lastOrder.reference)}</strong>.</p>
                    ${lastOrder.whatsappUrl
                        ? `<p>Un último paso: envía el mensaje por WhatsApp para que confirmemos disponibilidad, pago y entrega.</p>
                           <a class="btn btn-block" href="${esc(lastOrder.whatsappUrl)}" target="_blank" rel="noopener">Abrir WhatsApp</a>`
                        : `<p>Por ahora el contacto por WhatsApp no está configurado. Copia tu pedido y envíalo a la marca:</p>
                           <textarea class="input" rows="7" readonly>${esc(lastOrder.message)}</textarea>
                           <button type="button" class="btn btn-block" data-act="copy">Copiar pedido</button>`}
                    <button type="button" class="btn btn-ghost btn-block" data-act="back">Seguir viendo el catálogo</button>
                </div>`;
            return;
        }

        if (!state.lines.length) {
            footer.classList.add('is-hidden');
            body.innerHTML = `
                <div class="cart-empty">
                    <div class="empty-icon">${bagIcon()}</div>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega prendas del catálogo y envía tu pedido por WhatsApp.</p>
                    <a href="/shop" class="btn" data-act="back">Ver catálogo</a>
                </div>`;
            return;
        }

        body.innerHTML = `<ul class="cart-lines">${state.lines.map(lineHtml).join('')}</ul>`;
        footer.classList.remove('is-hidden');
        document.getElementById('cartTotal').textContent = money(state.total);
        const blocked = state.lines.some(l => l.issue && !l.issue.startsWith('Solo quedan')) || state.total <= 0;
        const btn = document.getElementById('cartSend');
        btn.disabled = blocked;
        btn.title = blocked ? 'Resuelve los avisos de tu carrito para continuar' : '';
    }

    function bagIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>'; }
    function checkIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'; }

    function mutate(idx, fn) {
        const line = state.lines[idx];
        if (!line) return;
        const items = read();
        const pos = items.findIndex(i => i.garmentId === line.garmentId && i.size === line.size);
        if (pos < 0) return;
        const keep = fn(items[pos], items, pos);
        if (keep === false) items.splice(pos, 1);
        write(items);
        refresh();
    }

    async function send() {
        const name = document.getElementById('cartName').value.trim();
        const notes = document.getElementById('cartNotes').value.trim();
        const nameEl = document.getElementById('cartName');
        if (name.length < 2) {
            nameEl.classList.add('is-invalid');
            nameEl.focus();
            return;
        }
        nameEl.classList.remove('is-invalid');
        const btn = document.getElementById('cartSend');
        btn.disabled = true;
        const label = btn.innerHTML;
        btn.textContent = 'Enviando…';
        try {
            const data = await ErosUI.request('/api/orders', {
                body: { customerName: name, notes, items: read() }
            });
            lastOrder = data;
            write([]);
            state = { ...state, lines: [], total: 0, count: 0 };
            view = 'done';
            render();
            if (data.whatsappUrl) window.open(data.whatsappUrl, '_blank', 'noopener');
        } catch (err) {
            if (err.message !== 'unauthorized') {
                ErosUI.toast(err.message, 'error', 6000);
                await refresh();
            }
        } finally {
            btn.innerHTML = label;
            btn.disabled = false;
        }
    }

    // ------------------------------------------------------------------
    // Inicialización
    // ------------------------------------------------------------------
    function open() {
        const el = document.getElementById('cartDrawer');
        if (!el || !window.ErosLayers) return;
        window.ErosLayers.open(el);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const drawer = document.getElementById('cartDrawer');
        if (!drawer) return;
        updateBadge(read().reduce((n, i) => n + i.qty, 0));

        window.addEventListener('eros:layer-open', e => {
            if (e.detail !== 'cartDrawer') return;
            if (view === 'done') { view = 'cart'; lastOrder = null; }
            refresh();
        });

        drawer.addEventListener('click', e => {
            const actEl = e.target.closest('[data-act]');
            if (!actEl) return;
            const act = actEl.dataset.act;
            const lineEl = e.target.closest('.cart-line');
            const idx = lineEl ? Number(lineEl.dataset.idx) : -1;
            if (act === 'inc') mutate(idx, item => { item.qty = Math.min(MAX_QTY, item.qty + 1); });
            if (act === 'dec') mutate(idx, item => { if (item.qty <= 1) return false; item.qty -= 1; });
            if (act === 'remove') mutate(idx, () => false);
            if (act === 'back') { window.ErosLayers.close(); }
            if (act === 'copy' && lastOrder) {
                navigator.clipboard.writeText(lastOrder.message).then(() => ErosUI.toast('Pedido copiado.', 'success', 2200));
            }
        });

        drawer.addEventListener('change', e => {
            if (!e.target.classList.contains('cart-size')) return;
            const idx = Number(e.target.closest('.cart-line').dataset.idx);
            const newSize = e.target.value;
            mutate(idx, (item, items) => {
                const dup = items.find(i => i !== item && i.garmentId === item.garmentId && i.size === newSize);
                if (dup) { dup.qty = Math.min(MAX_QTY, dup.qty + item.qty); return false; }
                item.size = newSize;
            });
        });

        document.getElementById('cartSend').addEventListener('click', send);

        // Prefija el nombre con el de la sesión si existe
        const nameEl = document.getElementById('cartName');
        if (nameEl && nameEl.dataset.default && !nameEl.value) nameEl.value = nameEl.dataset.default;

        // Botones "Agregar al carrito" de cualquier página
        document.addEventListener('click', e => {
            const btn = e.target.closest('[data-add-to-cart]');
            if (!btn) return;
            e.preventDefault();
            const id = parseInt(btn.dataset.addToCart, 10);
            let size = btn.dataset.size || '';
            if (btn.dataset.sizeSource) {
                const picked = document.querySelector(btn.dataset.sizeSource + ':checked');
                if (!picked) { ErosUI.toast('Elige una talla primero.', 'error', 2500); return; }
                size = picked.value;
            }
            const qty = btn.dataset.qtySource ? parseInt(document.querySelector(btn.dataset.qtySource).textContent, 10) || 1 : 1;
            add(id, size, qty);
            ErosUI.toast('Agregado a tu carrito.', 'success', 1800);
            open();
        });

        // "Comprar este look": agrega varias prendas
        document.addEventListener('click', e => {
            const btn = e.target.closest('[data-add-look]');
            if (!btn) return;
            e.preventDefault();
            let ids = [];
            try { ids = JSON.parse(btn.dataset.addLook); } catch (_) { /* ignora */ }
            [...new Set(ids)].forEach(id => add(Number(id), '', 1));
            if (ids.length) { ErosUI.toast(`Agregamos ${new Set(ids).size} prendas del look.`, 'success', 2200); open(); }
        });

        document.querySelectorAll('[data-open-cart]').forEach(b => b.addEventListener('click', open));
    });

    window.ErosCart = { add, open, refresh };
})();
