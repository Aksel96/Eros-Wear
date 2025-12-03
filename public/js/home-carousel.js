// public/js/home-carousel.js (NUEVO ARCHIVO)
// public/js/home-carousel.js (LÓGICA MEJORADA DE CENTRADO Y ESCALADO)

document.addEventListener('DOMContentLoaded', () => {
    const previewContainers = document.querySelectorAll('.carousel-outfit-canvas');

    const BASE_IMAGE_WIDTH = 100; // Asumimos 100px como el ancho original en el Canvas
    const VIEW_SIZE = 400;      // Tamaño fijo del contenedor en el Carrusel (400px de altura)
    const PADDING = 20;         // Píxeles de padding de seguridad dentro del contenedor

    previewContainers.forEach(container => {
        const jsonString = container.dataset.outfitItems;
        let items;

        try {
            items = JSON.parse(jsonString);
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Error al cargar diseño</p>';
            console.error('Error al parsear JSON para carrusel:', error);
            return;
        }

        if (items.length === 0) return;

        // --- 1. Calcular los límites del outfit (Bounding Box) ---
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

        items.forEach(item => {
            minX = Math.min(minX, item.x);
            minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x + BASE_IMAGE_WIDTH);
            maxY = Math.max(maxY, item.y + BASE_IMAGE_WIDTH);
        });

        const outfitWidth = maxX - minX;
        const outfitHeight = maxY - minY;

        // --- 2. Determinar Factor de Escala y Offset ---
        const scaleX = (VIEW_SIZE - 2 * PADDING) / outfitWidth;
        const scaleY = (VIEW_SIZE - 2 * PADDING) / outfitHeight;
        const finalScale = Math.min(scaleX, scaleY); // Usar el menor factor para garantizar que quepa

        // Calcular el desplazamiento para centrar
        const scaledOutfitWidth = outfitWidth * finalScale;
        const scaledOutfitHeight = outfitHeight * finalScale;

        const offsetX = (VIEW_SIZE - scaledOutfitWidth) / 2;
        const offsetY = (VIEW_SIZE - scaledOutfitHeight) / 2;

        // --- 3. Renderizar con las nuevas coordenadas ---
        container.innerHTML = '';
        container.style.width = `${VIEW_SIZE}px`;

        items.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = `Outfit Item`;

            img.style.position = 'absolute';

            // Aplicar escalado, normalizar y centrar
            const newX = (item.x - minX) * finalScale + offsetX;
            const newY = (item.y - minY) * finalScale + offsetY;

            img.style.left = `${newX}px`;
            img.style.top = `${newY}px`;
            img.style.width = `${BASE_IMAGE_WIDTH * finalScale}px`;
            img.style.pointerEvents = 'none';

            container.appendChild(img);
        });
    });
});