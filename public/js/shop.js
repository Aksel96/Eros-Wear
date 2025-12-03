// public/js/shop.js (NUEVO ARCHIVO)

document.addEventListener('DOMContentLoaded', () => {
    const detailButtons = document.querySelectorAll('.add-to-creator-btn');
    const garmentCards = document.querySelectorAll('.shop-item-card');
    const modal = document.getElementById('garmentModal');
    const modalImage = document.getElementById('modalGarmentImage');
    const modalName = document.getElementById('modalGarmentName');
    const favoriteButtons = document.querySelectorAll('.shop-favorite-btn');
    // ----------------------------------------------------
    // 1. Lógica de Zoom (Click en Tarjeta)
    // ----------------------------------------------------
    garmentCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Evitar que el clic en el botón active el zoom
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }

            // Obtener datos del contenedor (asumiendo que la imagen es el primer hijo del card-body)
            const imgElement = card.querySelector('img');
            const nameElement = card.querySelector('.card-title');

            if (imgElement && nameElement) {
                modalImage.src = imgElement.src;
                modalName.textContent = nameElement.textContent;

                // Mostrar el modal
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();
            }
        });
    });

    // ----------------------------------------------------
    // 2. Lógica de Cierre con Tecla ESC
    // ----------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    });

    // ----------------------------------------------------
    // Lógica de Agregar/Eliminar de Creador (Favoritos)
    // ----------------------------------------------------
    favoriteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const garmentId = e.currentTarget.dataset.garmentId;
            const isFavorite = e.currentTarget.dataset.isFavorite === '1';
            const clickedButton = e.currentTarget; // <--- Referencia segura

            // Determinar la URL y el texto de feedback
            let url, actionMessage;
            if (isFavorite) {
                url = `/shop/unfavorite/${garmentId}`;
                actionMessage = 'Prenda eliminada';
            } else {
                url = `/shop/favorite/${garmentId}`;
                actionMessage = 'Prenda agregada';
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const result = await response.json();

                if (result.success) {

                    const newStatus = isFavorite ? '0' : '1';

                    if (clickedButton) { // <--- VERIFICACIÓN CRÍTICA
                        // 1. Aplicamos el cambio visual seguro
                        if (newStatus === '1') {
                            // AGREGADO (Morado/Rojo)
                            clickedButton.style.backgroundColor = '#C62828';
                            clickedButton.style.borderColor = '#C62828';
                            clickedButton.textContent = 'Eliminar del Catálogo';
                        } else {
                            // ELIMINADO (Rose Gold)
                            clickedButton.style.backgroundColor = '#B7926F';
                            clickedButton.style.borderColor = '#B7926F';
                            clickedButton.textContent = 'Agregar al Creador';
                        }

                        clickedButton.dataset.isFavorite = newStatus;

                        alert(actionMessage + ' correctamente'); // Alerta de éxito aquí

                    } else {
                        // Si se perdió la referencia, solo mostramos el éxito del backend
                        alert(actionMessage + ' correctamente (Fallo en la actualización visual)');
                    }

                } else {
                    alert('Error: ' + result.message);
                }

            } catch (error) {
                // Ahora, la alerta es más precisa:
                console.error('ERROR DE CÓDIGO (FALLO VISUAL):', error);
                alert('ERROR DE INTERFAZ: La acción se completó en el servidor, pero hubo un fallo al actualizar el botón. Recarga la página.');
            }
        });
    });



});