// public/js/gallery-renderer.js

document.addEventListener('DOMContentLoaded', () => {

    const previewContainers = document.querySelectorAll('.outfit-preview');

    const BASE_IMAGE_WIDTH = 100; // Asumimos 100px como el ancho original en el Canvas
    const VIEW_SIZE = 250;      // Tamaño fijo del contenedor en la Galería (250px de altura)
    const PADDING = 15;         // Píxeles de padding de seguridad dentro del contenedor

    previewContainers.forEach(container => {
        const jsonString = container.dataset.outfitItems;
        let items;

        try {
            items = JSON.parse(jsonString);
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Error al cargar el outfit.</p>';
            console.error('Error al parsear JSON para renderizado:', error);
            return; // Detener si falla el JSON
        }

        if (items.length === 0) return; // No hacer nada si está vacío

        // --- 1. Calcular los límites del outfit (Bounding Box) ---
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

        items.forEach(item => {
            minX = Math.min(minX, item.x);
            minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x + BASE_IMAGE_WIDTH);
            maxY = Math.max(maxY, item.y + BASE_IMAGE_WIDTH); // Usamos BASE_IMAGE_WIDTH como proxy para la altura
        });

        const outfitWidth = maxX - minX;
        const outfitHeight = maxY - minY;

        // --- 2. Determinar Factor de Escala y Offset ---

        // Calcular el factor necesario para que el outfit quepa dentro del VIEW_SIZE con padding
        const scaleX = (VIEW_SIZE - 2 * PADDING) / outfitWidth;
        const scaleY = (VIEW_SIZE - 2 * PADDING) / outfitHeight;

        // Usar el menor factor para garantizar que quepa completamente
        const finalScale = Math.min(scaleX, scaleY);

        // Calcular el desplazamiento total necesario para centrar el outfit
        const scaledOutfitWidth = outfitWidth * finalScale;
        const scaledOutfitHeight = outfitHeight * finalScale;

        const offsetX = (VIEW_SIZE - scaledOutfitWidth) / 2;
        const offsetY = (VIEW_SIZE - scaledOutfitHeight) / 2;

        // --- 3. Renderizar con las nuevas coordenadas ---
        container.innerHTML = '';
        container.style.width = `${VIEW_SIZE}px`; // Aseguramos el tamaño de la galería

        items.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = item.name;

            img.style.position = 'absolute';

            // Aplicar escalado, normalizar a (0,0) restando minX/minY, y luego aplicar el offset de centrado
            const newX = (item.x - minX) * finalScale + offsetX;
            const newY = (item.y - minY) * finalScale + offsetY;

            img.style.left = `${newX}px`;
            img.style.top = `${newY}px`;
            img.style.width = `${BASE_IMAGE_WIDTH * finalScale}px`; // Escalar el tamaño de la prenda
            img.style.pointerEvents = 'none';

            container.appendChild(img);
        });
    });




    // ----------------------------------------------------
    // 2. LÓGICA DE LIKES
    // ----------------------------------------------------
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const outfitId = e.currentTarget.dataset.outfitId;

            try {
                const response = await fetch(`/outfits/${outfitId}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    console.error('HTTP Error Status:', response.status);
                    const errorData = await response.json();
                    alert('Error del servidor (HTTP): ' + (errorData.message || response.statusText));
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    const clickedButton = e.currentTarget;
                    if (clickedButton) {
                        console.log(`[LIKE DEBUG] Conteo Anterior: ${clickedButton.innerHTML}`);
                        // La actualización de estilo debe ser la misma que la del HTML
                        clickedButton.classList.remove('btn-outline-danger');
                        clickedButton.classList.add('btn-danger');

                        // ¡ACTUALIZACIÓN CRÍTICA!
                        // Aseguramos que solo el número se actualice, manteniendo el ícono.
                        // Reemplaza el contenido del botón con el ícono y el nuevo conteo.
                        clickedButton.innerHTML = `❤️ ${result.newCount}`;

                        console.log(`[LIKE DEBUG] Conteo Nuevo (esperado): ${clickedButton.innerHTML}`);
                        // Deshabilitar temporalmente
                        clickedButton.disabled = true;
                        setTimeout(() => clickedButton.disabled = false, 1000);
                    }
                } else {
                    alert('Error al gestionar like: ' + result.message);
                }

            } catch (error) {
                console.error('ERROR CRÍTICO DURANTE EL PROCESO DE LIKE:', error);
                alert('ERROR INTERNO DE CÓDIGO. Revisa la consola para el detalle del fallo.');
            }
        });
    });


    // ----------------------------------------------------
    // 3. LÓGICA DE EDICIÓN: Redirigir al Canvas
    // ----------------------------------------------------
    document.querySelectorAll('.edit-outfit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const outfitId = e.currentTarget.dataset.outfitId;

            // REDIRECCIÓN CORREGIDA A /tester
            window.location.href = `/tester?edit=${outfitId}`;
        });
    });

}); // CIERRE FINAL DE DOMContentLoaded
