// public/js/product.js · Página de producto: cantidad y zoom
document.addEventListener('DOMContentLoaded', () => {
    const qtyValue = document.getElementById('qtyValue');
    const MAX = 10;
    const setQty = n => { if (qtyValue) qtyValue.textContent = Math.max(1, Math.min(MAX, n)); };
    const dec = document.getElementById('qtyDec');
    const inc = document.getElementById('qtyInc');
    if (dec) dec.addEventListener('click', () => setQty(Number(qtyValue.textContent) - 1));
    if (inc) inc.addEventListener('click', () => setQty(Number(qtyValue.textContent) + 1));

    // Zoom al hacer clic: la prenda se acerca hacia donde apuntas
    const stage = document.getElementById('pdpStage');
    const hint = document.getElementById('pdpHint');
    if (!stage) return;
    const move = e => {
        const r = stage.getBoundingClientRect();
        stage.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
        stage.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    stage.addEventListener('click', e => {
        move(e);
        const on = stage.classList.toggle('zoomed');
        stage.classList.toggle('is-tilting', false);
        if (hint) hint.textContent = on ? 'Mueve el cursor para recorrer la tela' : 'Toca para hacer zoom';
    });
    stage.addEventListener('pointermove', e => { if (stage.classList.contains('zoomed')) move(e); });
    stage.addEventListener('pointerleave', () => { stage.classList.remove('zoomed'); if (hint) hint.textContent = 'Toca para hacer zoom'; });
});
