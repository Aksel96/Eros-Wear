// public/js/main.js · Comportamiento global de Eros Wear
(function () {
    'use strict';

    // Ancho (px) de cada prenda dentro del lienzo del probador.
    // Lo comparten el probador y las vistas previas de outfits.
    window.EROS_ITEM_WIDTH = 130;

    const ICONS = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 7v6M12 17h.01"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 11v6M12 7h.01"/></svg>'
    };

    // ------------------------------------------------------------------
    // ErosUI: toasts y diálogos (reemplazan alert / confirm / prompt)
    // ------------------------------------------------------------------
    const ErosUI = {
        toast(message, type = 'info', timeout = 4200) {
            const stack = document.getElementById('toastStack');
            if (!stack) return;
            const el = document.createElement('div');
            el.className = `eros-toast ${type}`;
            el.setAttribute('role', type === 'error' ? 'alert' : 'status');
            el.innerHTML = `<span class="t-icon">${ICONS[type] || ICONS.info}</span><span class="t-msg"></span><button type="button" aria-label="Cerrar">&times;</button>`;
            el.querySelector('.t-msg').textContent = message;
            const close = () => {
                el.classList.add('leaving');
                setTimeout(() => el.remove(), 300);
            };
            el.querySelector('button').addEventListener('click', close);
            stack.appendChild(el);
            if (timeout) setTimeout(close, timeout);
        },

        _dialog({ title, message, okText = 'Aceptar', cancelText = 'Cancelar', danger = false, input = null }) {
            return new Promise(resolve => {
                const modalEl = document.getElementById('erosDialog');
                if (!modalEl || !window.bootstrap) {
                    resolve(input ? window.prompt(message, input.value || '') : window.confirm(message));
                    return;
                }
                const form = document.getElementById('erosDialogForm');
                const field = document.getElementById('erosDialogField');
                const inputEl = document.getElementById('erosDialogInput');
                const okBtn = document.getElementById('erosDialogOk');

                document.getElementById('erosDialogTitle').textContent = title;
                document.getElementById('erosDialogMessage').textContent = message || '';
                document.getElementById('erosDialogMessage').classList.toggle('d-none', !message);
                document.getElementById('erosDialogCancel').textContent = cancelText;
                okBtn.textContent = okText;
                okBtn.style.background = danger ? 'var(--danger)' : '';
                field.classList.toggle('d-none', !input);
                if (input) {
                    document.getElementById('erosDialogLabel').textContent = input.label || 'Nombre';
                    inputEl.value = input.value || '';
                    inputEl.placeholder = input.placeholder || '';
                }

                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                let result = input ? null : false;

                const onSubmit = e => {
                    e.preventDefault();
                    if (input) {
                        const value = inputEl.value.trim();
                        if (!value) { inputEl.classList.add('is-invalid'); inputEl.focus(); return; }
                        result = value;
                    } else {
                        result = true;
                    }
                    modal.hide();
                };
                const onShown = () => { if (input) { inputEl.focus(); inputEl.select(); } else okBtn.focus(); };
                const onHidden = () => {
                    form.removeEventListener('submit', onSubmit);
                    modalEl.removeEventListener('shown.bs.modal', onShown);
                    modalEl.removeEventListener('hidden.bs.modal', onHidden);
                    inputEl.classList.remove('is-invalid');
                    resolve(result);
                };
                form.addEventListener('submit', onSubmit);
                modalEl.addEventListener('shown.bs.modal', onShown);
                modalEl.addEventListener('hidden.bs.modal', onHidden);
                modal.show();
            });
        },

        confirm(message, opts = {}) {
            return this._dialog({ title: opts.title || '¿Estás seguro?', message, okText: opts.okText || 'Sí, continuar', danger: opts.danger });
        },

        prompt(title, opts = {}) {
            return this._dialog({ title, message: opts.message, okText: opts.okText || 'Guardar', input: { label: opts.label, value: opts.value, placeholder: opts.placeholder } });
        },

        async request(url, options = {}) {
            const res = await fetch(url, {
                method: options.method || 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: options.body ? JSON.stringify(options.body) : undefined,
                credentials: 'same-origin'
            });
            let data = {};
            try { data = await res.json(); } catch (_) { /* respuesta sin JSON */ }
            if (res.status === 401) {
                ErosUI.toast(data.message || 'Inicia sesión para continuar.', 'error');
                setTimeout(() => { window.location.href = '/login'; }, 900);
                throw new Error('unauthorized');
            }
            if (!res.ok || data.success === false) {
                throw new Error(data.message || 'Algo salió mal. Intenta de nuevo.');
            }
            return data;
        }
    };
    window.ErosUI = ErosUI;

    // ------------------------------------------------------------------
    // Vista previa de outfits: escala y centra las prendas en su contenedor
    // ------------------------------------------------------------------
    function loadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async function renderOutfit(container) {
        let items;
        try {
            items = JSON.parse(container.dataset.outfitItems || '[]');
        } catch (e) {
            container.innerHTML = '<div class="outfit-loading">Vista no disponible</div>';
            return;
        }
        if (!items.length) return;

        const W = window.EROS_ITEM_WIDTH;
        const imgs = await Promise.all(items.map(i => loadImage(i.image_url)));
        const placed = items.map((item, idx) => {
            const img = imgs[idx];
            const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
            return { item, img, x: Number(item.x), y: Number(item.y), w: W, h: W * ratio };
        }).filter(p => p.img);
        if (!placed.length) return;

        const minX = Math.min(...placed.map(p => p.x));
        const minY = Math.min(...placed.map(p => p.y));
        const maxX = Math.max(...placed.map(p => p.x + p.w));
        const maxY = Math.max(...placed.map(p => p.y + p.h));

        const draw = () => {
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            if (!cw || !ch) return;
            const pad = Math.min(cw, ch) * 0.08;
            const scale = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY), 2.2);
            const offX = (cw - (maxX - minX) * scale) / 2;
            const offY = (ch - (maxY - minY) * scale) / 2;

            container.innerHTML = '';
            placed.forEach(p => {
                const el = document.createElement('img');
                el.src = p.img.src;
                el.alt = p.item.name || '';
                el.style.left = `${(p.x - minX) * scale + offX}px`;
                el.style.top = `${(p.y - minY) * scale + offY}px`;
                el.style.width = `${p.w * scale}px`;
                container.appendChild(el);
            });
        };
        draw();
        if ('ResizeObserver' in window) new ResizeObserver(draw).observe(container);
    }
    window.renderOutfit = renderOutfit;

    // ------------------------------------------------------------------
    // Inicialización
    // ------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        // Mensajes flash del servidor
        document.querySelectorAll('[data-flash]').forEach(el => {
            ErosUI.toast(el.textContent.trim(), el.dataset.flash);
            el.remove();
        });

        // Navbar: sombra al hacer scroll y menú móvil
        const nav = document.getElementById('siteNav');
        const toggle = document.getElementById('navToggle');
        const onScroll = () => nav && nav.classList.toggle('navbar-scrolled', window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        if (toggle) {
            toggle.addEventListener('click', () => {
                const open = document.body.classList.toggle('nav-open');
                toggle.setAttribute('aria-expanded', String(open));
            });
        }

        // Animación de aparición al hacer scroll
        const reveals = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            reveals.forEach(el => io.observe(el));
        } else {
            reveals.forEach(el => el.classList.add('in'));
        }

        // Vistas previas de outfits
        document.querySelectorAll('.outfit-render[data-outfit-items]').forEach(renderOutfit);

        // Formularios que piden confirmación (p. ej. eliminar outfit)
        document.querySelectorAll('form[data-confirm]').forEach(form => {
            form.addEventListener('submit', async e => {
                if (form.dataset.confirmed) return;
                e.preventDefault();
                const ok = await ErosUI.confirm(form.dataset.confirm, { okText: 'Eliminar', danger: true });
                if (ok) {
                    form.dataset.confirmed = '1';
                    form.submit();
                }
            });
        });

        // Likes (galería e inicio)
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const data = await ErosUI.request(`/outfits/${btn.dataset.outfitId}/like`);
                    btn.classList.toggle('is-liked', data.liked);
                    btn.setAttribute('aria-pressed', String(data.liked));
                    btn.querySelector('.like-count').textContent = data.newCount;
                    btn.classList.remove('pop');
                    void btn.offsetWidth;
                    if (data.liked) btn.classList.add('pop');
                } catch (err) {
                    if (err.message !== 'unauthorized') ErosUI.toast(err.message, 'error');
                } finally {
                    btn.disabled = false;
                }
            });
        });

        // Newsletter (sin backend: confirma en la interfaz)
        const newsletter = document.getElementById('newsletter-form');
        if (newsletter) {
            newsletter.addEventListener('submit', e => {
                e.preventDefault();
                const input = newsletter.querySelector('input[type="email"]');
                if (!input.checkValidity()) {
                    ErosUI.toast('Introduce un correo electrónico válido.', 'error');
                    return;
                }
                ErosUI.toast('¡Listo! Te avisaremos de cada lanzamiento.', 'success');
                newsletter.reset();
            });
        }
    });
})();
