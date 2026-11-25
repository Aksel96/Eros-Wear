// public/js/shop.js · Catálogo: vista ampliada y prendas del probador
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('garmentModal');

    // Vista ampliada
    document.querySelectorAll('.js-zoom').forEach(btn => {
        btn.addEventListener('click', () => {
            const { name, img, category, favs, usage } = btn.dataset;
            document.getElementById('modalGarmentImage').src = img;
            document.getElementById('modalGarmentImage').alt = name;
            document.getElementById('modalGarmentName').textContent = name;
            document.getElementById('modalGarmentCategory').textContent = category;
            document.getElementById('modalGarmentStats').textContent =
                `${favs} ${favs === '1' ? 'persona la tiene' : 'personas la tienen'} en su probador · usada en ${usage} ${usage === '1' ? 'outfit' : 'outfits'}`;
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
    });

    // Agregar / quitar del probador
    const ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const isFavorite = btn.dataset.isFavorite === '1';
            const id = btn.dataset.garmentId;
            const name = btn.closest('.product-card').querySelector('.product-name').textContent;
            btn.disabled = true;
            try {
                await ErosUI.request(`/shop/${isFavorite ? 'unfavorite' : 'favorite'}/${id}`);
                const nowFav = !isFavorite;
                btn.dataset.isFavorite = nowFav ? '1' : '0';
                btn.classList.toggle('is-active', nowFav);
                btn.setAttribute('aria-pressed', String(nowFav));
                btn.querySelector('.fav-icon').innerHTML = nowFav ? ICON_CHECK : ICON_PLUS;
                btn.querySelector('.fav-label').textContent = nowFav ? 'En tu probador' : 'Al probador';
                btn.classList.remove('pop');
                void btn.offsetWidth;
                btn.classList.add('pop');
                ErosUI.toast(nowFav ? `${name} se agregó a tu probador.` : `${name} salió de tu probador.`, 'success', 2600);
            } catch (err) {
                if (err.message !== 'unauthorized') ErosUI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        });
    });
});
