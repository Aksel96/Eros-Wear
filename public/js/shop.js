// public/js/shop.js · Catálogo: prendas del probador
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fav-icon-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const isFavorite = btn.dataset.isFavorite === '1';
            const id = btn.dataset.garmentId;
            const name = btn.closest('.product-wrap').querySelector('.product-name').textContent.trim();
            btn.disabled = true;
            try {
                await ErosUI.request(`/shop/${isFavorite ? 'unfavorite' : 'favorite'}/${id}`);
                const nowFav = !isFavorite;
                btn.dataset.isFavorite = nowFav ? '1' : '0';
                btn.classList.toggle('is-active', nowFav);
                btn.setAttribute('aria-pressed', String(nowFav));
                const label = nowFav ? 'Quitar de mi probador' : 'Agregar a mi probador';
                btn.title = label;
                btn.setAttribute('aria-label', label);
                btn.classList.remove('pop');
                void btn.offsetWidth;
                btn.classList.add('pop');
                ErosUI.toast(nowFav ? `${name} se agregó a tu probador.` : `${name} salió de tu probador.`, 'success', 2400);
            } catch (err) {
                if (err.message !== 'unauthorized') ErosUI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        });
    });
});
