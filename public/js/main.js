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
                const dlg = document.getElementById('erosDialog');
                if (!dlg || typeof dlg.showModal !== 'function') {
                    resolve(input ? window.prompt(message || title, input.value || '') : window.confirm(message || title));
                    return;
                }
                const form = document.getElementById('erosDialogForm');
                const field = document.getElementById('erosDialogField');
                const inputEl = document.getElementById('erosDialogInput');
                const okBtn = document.getElementById('erosDialogOk');
                const cancelBtn = document.getElementById('erosDialogCancel');
                const msg = document.getElementById('erosDialogMessage');

                document.getElementById('erosDialogTitle').textContent = title;
                msg.textContent = message || '';
                msg.classList.toggle('is-hidden', !message);
                cancelBtn.textContent = cancelText;
                okBtn.textContent = okText;
                okBtn.style.setProperty('--bg', danger ? 'var(--danger)' : '');
                field.classList.toggle('is-hidden', !input);
                if (input) {
                    document.getElementById('erosDialogLabel').textContent = input.label || 'Nombre';
                    inputEl.value = input.value || '';
                    inputEl.placeholder = input.placeholder || '';
                }

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
                    dlg.close();
                };
                const onCancel = () => dlg.close();
                const onClose = () => {
                    form.removeEventListener('submit', onSubmit);
                    cancelBtn.removeEventListener('click', onCancel);
                    dlg.removeEventListener('close', onClose);
                    dlg.removeEventListener('click', onBackdrop);
                    inputEl.classList.remove('is-invalid');
                    resolve(result);
                };
                // Un clic sobre el fondo oscuro cierra el diálogo
                const onBackdrop = e => { if (e.target === dlg) dlg.close(); };
                form.addEventListener('submit', onSubmit);
                cancelBtn.addEventListener('click', onCancel);
                dlg.addEventListener('close', onClose);
                dlg.addEventListener('click', onBackdrop);
                dlg.showModal();
                if (input) { inputEl.focus(); inputEl.select(); } else okBtn.focus();
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
    // Capas (menú de cuenta y carrito): una sola a la vez
    // ------------------------------------------------------------------
    const layers = {
        current: null,
        open(el) {
            if (this.current && this.current !== el) this.close();
            this.current = el;
            el.classList.add('is-open');
            el.setAttribute('aria-hidden', 'false');
            const backdrop = document.getElementById('backdrop');
            backdrop.classList.add('is-open');
            backdrop.classList.toggle('account', el.id === 'accountMenu');
            if (el.id !== 'accountMenu' || window.innerWidth < 900) document.body.classList.add('is-locked');
            window.dispatchEvent(new CustomEvent('eros:layer-open', { detail: el.id }));
        },
        close() {
            if (!this.current) return;
            this.current.classList.remove('is-open');
            this.current.setAttribute('aria-hidden', 'true');
            document.getElementById('backdrop').classList.remove('is-open');
            document.body.classList.remove('is-locked');
            this.current = null;
        }
    };
    window.ErosLayers = layers;

    function initChrome() {
        const header = document.getElementById('siteNav');
        const progress = document.getElementById('scrollProgress');
        let lastY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            ticking = false;
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (progress && max > 0) progress.style.transform = `scaleX(${Math.min(1, y / max)})`;
            // En móvil la cabecera se oculta al bajar y reaparece al subir
            const goingDown = y > lastY + 6;
            const goingUp = y < lastY - 6;
            if (header && window.innerWidth < 900) {
                if (goingDown && y > 120) { header.classList.add('is-hidden-up'); document.body.classList.add('header-up'); }
                else if (goingUp || y < 80) { header.classList.remove('is-hidden-up'); document.body.classList.remove('header-up'); }
            } else if (header) {
                header.classList.remove('is-hidden-up');
                document.body.classList.remove('header-up');
            }
            if (Math.abs(y - lastY) > 6) lastY = y;
        };
        window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
        onScroll();

        const menu = document.getElementById('accountMenu');
        document.querySelectorAll('[data-toggle-account]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!menu) return;
                if (layers.current === menu) layers.close(); else layers.open(menu);
            });
        });
        document.querySelectorAll('[data-close-layers]').forEach(el => el.addEventListener('click', () => layers.close()));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') layers.close(); });
        if (menu) menu.addEventListener('click', e => { if (e.target.closest('a')) layers.close(); });
    }

    // ------------------------------------------------------------------
    // Movimiento: aparición al hacer scroll, texto por palabras, parallax y contadores
    // ------------------------------------------------------------------
    function initMotion() {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Texto que aparece palabra por palabra
        document.querySelectorAll('[data-split]').forEach(el => {
            let k = 0;
            const wrap = node => {
                node.childNodes.forEach(child => {
                    if (child.nodeType === 3) {
                        const frag = document.createDocumentFragment();
                        child.textContent.split(/(\s+)/).forEach(part => {
                            if (!part) return;
                            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                            const w = document.createElement('span');
                            w.className = 'w';
                            const inner = document.createElement('span');
                            inner.textContent = part;
                            inner.style.setProperty('--k', k++);
                            w.appendChild(inner);
                            frag.appendChild(w);
                        });
                        child.replaceWith(frag);
                    } else if (child.nodeType === 1) {
                        wrap(child);
                    }
                });
            };
            wrap(el);
            el.querySelectorAll('.w > span').forEach(s => s.style.transitionDelay = `${Number(s.style.getPropertyValue('--k')) * 38}ms`);
        });

        // Contadores
        const countUp = el => {
            const target = Number(el.dataset.count);
            if (!Number.isFinite(target) || reduce) return;
            const start = performance.now();
            const dur = 1400;
            const tick = now => {
                const t = Math.min(1, (now - start) / dur);
                el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
                if (t < 1) requestAnimationFrame(tick);
            };
            el.textContent = '0';
            requestAnimationFrame(tick);
        };

        // Retardo y escalonado
        document.querySelectorAll('[data-reveal][data-d]').forEach(el => el.style.setProperty('--d', `${el.dataset.d}ms`));

        const targets = document.querySelectorAll('[data-reveal], [data-split]');
        if ('IntersectionObserver' in window && !reduce) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('in');
                    entry.target.querySelectorAll('[data-count]').forEach(countUp);
                    if (entry.target.matches('[data-count]')) countUp(entry.target);
                    io.unobserve(entry.target);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
            targets.forEach(el => io.observe(el));
        } else {
            targets.forEach(el => el.classList.add('in'));
        }

        // Parallax suave (solo elementos visibles)
        const par = Array.from(document.querySelectorAll('[data-parallax]'));
        if (par.length && !reduce) {
            let ticking = false;
            const update = () => {
                ticking = false;
                const vh = window.innerHeight;
                par.forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.bottom < -100 || r.top > vh + 100) return;
                    const speed = Number(el.dataset.parallax) || 0;
                    const offset = (r.top + r.height / 2 - vh / 2) * speed;
                    el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
                });
            };
            window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
            window.addEventListener('resize', update);
            update();
        }
    }

    // ------------------------------------------------------------------
    // Inicialización
    // ------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        // Mensajes flash del servidor
        document.querySelectorAll('[data-flash]').forEach(el => {
            ErosUI.toast(el.textContent.trim(), el.dataset.flash);
            el.remove();
        });

        initChrome();
        initMotion();

        // Inclinación 3D con brillo en tarjetas de producto (solo con ratón)
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.querySelectorAll('[data-tilt]').forEach(el => {
                el.addEventListener('pointermove', e => {
                    if (el.classList.contains('zoomed')) return;
                    const r = el.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width;
                    const py = (e.clientY - r.top) / r.height;
                    el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
                    el.style.setProperty('--rx', `${(0.5 - py) * 12}deg`);
                    el.style.setProperty('--mx', `${px * 100}%`);
                    el.style.setProperty('--my', `${py * 100}%`);
                    el.classList.add('is-tilting');
                });
                el.addEventListener('pointerleave', () => el.classList.remove('is-tilting'));
            });
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
