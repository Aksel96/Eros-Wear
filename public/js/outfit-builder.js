// public/js/outfit-builder.js · Probador de outfits
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('outfit-canvas');
    if (!canvas) return;

    const studio = document.getElementById('studio');
    const currentUserId = Number(studio.dataset.userId);
    const nameInput = document.getElementById('outfitName');
    const modeBadge = document.getElementById('modeBadge');
    const saveBtn = document.getElementById('saveOutfit');
    const saveLabel = document.getElementById('saveLabel');
    const removeBtn = document.getElementById('removeItem');
    const frontBtn = document.getElementById('bringFront');
    const ITEM_W = window.EROS_ITEM_WIDTH || 130;

    let currentOutfitId = null;
    let selected = null;
    let dirty = false;

    // ------------------------------------------------------------------
    // Estado del lienzo
    // ------------------------------------------------------------------
    function refreshState() {
        const hasItems = canvas.querySelector('.outfit-item') !== null;
        canvas.classList.toggle('has-items', hasItems);
        removeBtn.disabled = !selected;
        frontBtn.disabled = !selected;
    }

    function setMode(outfitId) {
        currentOutfitId = outfitId;
        modeBadge.classList.toggle('d-none', !outfitId);
        saveLabel.textContent = outfitId ? 'Guardar cambios' : 'Guardar outfit';
    }

    function select(el) {
        if (selected) selected.classList.remove('selected');
        selected = el;
        if (el) el.classList.add('selected');
        refreshState();
    }

    function addItem({ id, name, src, x, y }) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = name || '';
        img.className = 'outfit-item';
        img.draggable = false;
        img.tabIndex = 0;
        img.dataset.garmentId = id;
        img.style.width = `${ITEM_W}px`;
        img.style.left = `${x}px`;
        img.style.top = `${y}px`;
        makeMovable(img);
        canvas.appendChild(img);
        dirty = true;
        refreshState();
        return img;
    }

    function addAtCenter(tile) {
        const rect = canvas.getBoundingClientRect();
        const count = canvas.querySelectorAll('.outfit-item').length;
        const el = addItem({
            id: tile.dataset.id,
            name: tile.dataset.name,
            src: tile.dataset.src,
            x: rect.width / 2 - ITEM_W / 2 + (count % 4) * 14,
            y: 40 + (count % 6) * 40
        });
        select(el);
    }

    // ------------------------------------------------------------------
    // Catálogo → lienzo (arrastrar en escritorio, tocar en cualquier lado)
    // ------------------------------------------------------------------
    let dragged = null;
    document.querySelectorAll('.garment-tile').forEach(tile => {
        tile.addEventListener('dragstart', e => {
            dragged = tile;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', tile.dataset.id);
            const ghost = tile.querySelector('img');
            if (ghost) e.dataTransfer.setDragImage(ghost, ghost.width / 2, ghost.height / 2);
        });
        tile.addEventListener('dragend', () => { dragged = null; canvas.classList.remove('drag-over'); });
        tile.addEventListener('click', () => addAtCenter(tile));
        tile.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addAtCenter(tile); }
        });
    });

    canvas.addEventListener('dragover', e => {
        if (!dragged) return;
        e.preventDefault();
        canvas.classList.add('drag-over');
    });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('drag-over'));
    canvas.addEventListener('drop', e => {
        e.preventDefault();
        canvas.classList.remove('drag-over');
        if (!dragged) return;
        const rect = canvas.getBoundingClientRect();
        const img = dragged.querySelector('img');
        const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
        const el = addItem({
            id: dragged.dataset.id,
            name: dragged.dataset.name,
            src: dragged.dataset.src,
            x: e.clientX - rect.left - ITEM_W / 2,
            y: e.clientY - rect.top - (ITEM_W * ratio) / 2
        });
        select(el);
        dragged = null;
    });

    // ------------------------------------------------------------------
    // Mover prendas dentro del lienzo (ratón y táctil)
    // ------------------------------------------------------------------
    function makeMovable(el) {
        let start = null;

        el.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            select(el);
            el.focus({ preventScroll: true });
            el.setPointerCapture(e.pointerId);
            start = {
                px: e.clientX,
                py: e.clientY,
                x: parseFloat(el.style.left),
                y: parseFloat(el.style.top)
            };
            el.classList.add('dragging');
        });

        el.addEventListener('pointermove', e => {
            if (!start) return;
            const maxX = canvas.clientWidth - 30;
            const maxY = canvas.clientHeight - 30;
            const x = Math.min(maxX, Math.max(30 - el.offsetWidth, start.x + e.clientX - start.px));
            const y = Math.min(maxY, Math.max(30 - el.offsetHeight, start.y + e.clientY - start.py));
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            dirty = true;
        });

        const end = () => {
            start = null;
            el.classList.remove('dragging');
        };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);

        el.addEventListener('contextmenu', e => {
            e.preventDefault();
            removeItem(el);
        });
    }

    function removeItem(el) {
        if (!el) return;
        if (selected === el) selected = null;
        el.remove();
        dirty = true;
        refreshState();
    }

    canvas.addEventListener('pointerdown', e => {
        if (e.target === canvas) select(null);
    });

    // Teclado: flechas para afinar, Supr/Retroceso para quitar
    document.addEventListener('keydown', e => {
        if (!selected || document.activeElement === nameInput) return;
        if (document.querySelector('.modal.show')) return;
        const step = e.shiftKey ? 20 : 4;
        let x = parseFloat(selected.style.left);
        let y = parseFloat(selected.style.top);
        switch (e.key) {
            case 'ArrowUp': y -= step; break;
            case 'ArrowDown': y += step; break;
            case 'ArrowLeft': x -= step; break;
            case 'ArrowRight': x += step; break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                removeItem(selected);
                return;
            case 'Escape':
                select(null);
                return;
            default:
                return;
        }
        e.preventDefault();
        selected.style.left = `${x}px`;
        selected.style.top = `${y}px`;
        dirty = true;
    });

    removeBtn.addEventListener('click', () => removeItem(selected));
    frontBtn.addEventListener('click', () => {
        if (!selected) return;
        canvas.appendChild(selected);
        selected.focus({ preventScroll: true });
        dirty = true;
    });

    document.getElementById('clearCanvas').addEventListener('click', async () => {
        if (!canvas.querySelector('.outfit-item')) {
            setMode(null);
            nameInput.value = '';
            return;
        }
        const ok = await ErosUI.confirm('Se quitarán todas las prendas del lienzo y empezarás un outfit nuevo.', {
            title: '¿Empezar de cero?', okText: 'Limpiar', danger: true
        });
        if (!ok) return;
        canvas.querySelectorAll('.outfit-item').forEach(el => el.remove());
        selected = null;
        setMode(null);
        nameInput.value = '';
        dirty = false;
        refreshState();
    });

    // ------------------------------------------------------------------
    // Guardar (crear o actualizar)
    // ------------------------------------------------------------------
    function collectItems() {
        return Array.from(canvas.querySelectorAll('.outfit-item')).map(el => ({
            garmentId: parseInt(el.dataset.garmentId, 10),
            x: parseFloat(el.style.left),
            y: parseFloat(el.style.top)
        }));
    }

    saveBtn.addEventListener('click', async () => {
        const items = collectItems();
        if (!items.length) {
            ErosUI.toast('Agrega al menos una prenda al lienzo.', 'error');
            return;
        }

        let name = nameInput.value.trim();
        if (!name) {
            name = await ErosUI.prompt('Nombra tu outfit', {
                label: 'Nombre', placeholder: 'Ej. Noche Amatista', okText: 'Guardar'
            });
            if (!name) return;
            nameInput.value = name;
        }

        saveBtn.disabled = true;
        try {
            const data = await ErosUI.request(currentOutfitId ? `/outfits/${currentOutfitId}` : '/outfits', {
                method: currentOutfitId ? 'PUT' : 'POST',
                body: { outfitName: name, items }
            });
            const wasNew = !currentOutfitId;
            setMode(data.outfitId || currentOutfitId);
            dirty = false;
            ErosUI.toast(wasNew ? `“${name}” ya está en la galería.` : `“${name}” se actualizó.`, 'success');
        } catch (err) {
            if (err.message !== 'unauthorized') ErosUI.toast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });

    window.addEventListener('beforeunload', e => {
        if (dirty && canvas.querySelector('.outfit-item')) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // ------------------------------------------------------------------
    // Cargar outfit para edición (?edit=ID)
    // ------------------------------------------------------------------
    async function loadForEdit(id) {
        try {
            const res = await fetch(`/outfits/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'No encontramos ese outfit.');

            const isOwner = Number(data.userId) === currentUserId;
            data.items.forEach(item => addItem({
                id: item.garmentId, name: item.name, src: item.imageUrl, x: item.x, y: item.y
            }));
            nameInput.value = isOwner ? data.name : `${data.name} (versión)`;
            setMode(isOwner ? Number(id) : null);
            dirty = false;
            ErosUI.toast(isOwner ? `Editando “${data.name}”.` : 'Cargamos una copia; se guardará como un outfit nuevo.', 'info', 3000);
        } catch (err) {
            ErosUI.toast(err.message, 'error');
        } finally {
            history.replaceState(null, '', location.pathname);
        }
    }

    const editId = new URLSearchParams(location.search).get('edit');
    if (editId) loadForEdit(editId);

    refreshState();
});
