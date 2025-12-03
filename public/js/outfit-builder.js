// public/js/outfit-builder.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('outfit-canvas');
    const garments = document.querySelectorAll('.garment-item');
    const saveOutfitBtn = document.getElementById('saveOutfit');
    const clearCanvasBtn = document.getElementById('clearCanvas');

    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const modal = document.getElementById('styleAdvisorModal');


    // **VARIABLES DE ESTADO GLOBAL PARA UPDATE**
    let currentOutfitId = null;
    let currentOutfitName = 'Nuevo Outfit'; // Para mostrar en el prompt



    if (!canvas) return; // Aseguramos que solo se ejecute en la página con el canvas

    // ----------------------------------------------------
    // A. LÓGICA DRAG (Emisor)
    // ----------------------------------------------------
    let draggedGarmentData = {};

    garments.forEach(garment => {
        garment.addEventListener('dragstart', (e) => {
            // Guardar los datos de la prenda que se está arrastrando
            draggedGarmentData = {
                id: garment.dataset.id,
                name: garment.dataset.name,
                src: garment.querySelector('img').src
            };

            // Usar setDragImage para que la imagen arrastrada sea más representativa
            const dragImage = document.createElement('img');
            dragImage.src = draggedGarmentData.src;
            dragImage.style.width = '100px';
            dragImage.style.opacity = '0.5';
            document.body.appendChild(dragImage);

            e.dataTransfer.setDragImage(dragImage, 50, 50);

            // Limpieza: Remover la imagen temporal después de un corto tiempo
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });
    });


    // ----------------------------------------------------
    // B. LÓGICA DROP (Receptor)
    // ----------------------------------------------------

    // 1. Prevenir el comportamiento por defecto (necesario para que 'drop' funcione)
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.style.backgroundColor = '#f0f8ff'; // Efecto visual al pasar por encima
    });

    canvas.addEventListener('dragleave', (e) => {
        canvas.style.backgroundColor = 'white';
    });

    // 2. Manejar el evento DROP (soltar)
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.style.backgroundColor = 'white';

        if (Object.keys(draggedGarmentData).length === 0) return; // Evitar drops vacíos

        // Calcular la posición relativa dentro del canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; // Coordenada X relativa al canvas
        const y = e.clientY - rect.top;  // Coordenada Y relativa al canvas

        // Crear la imagen en el canvas
        const img = document.createElement('img');
        img.src = draggedGarmentData.src;
        img.alt = draggedGarmentData.name;

        // Estilos y propiedades para el D&D:
        img.classList.add('outfit-item');
        img.style.position = 'absolute';
        img.style.left = `${x - 50}px`; // Centrar la imagen en la posición del cursor
        img.style.top = `${y - 50}px`;
        img.style.width = '100px'; // Tamaño visible
        img.style.cursor = 'move';
        img.dataset.garmentId = draggedGarmentData.id; // Guardar el ID para guardar en BD

        // IMPLEMENTACIÓN DE DRAG DEL ELEMENTO DENTRO DEL CANVAS
        makeElementDraggable(img);

        canvas.appendChild(img);
        draggedGarmentData = {}; // Resetear los datos
    });

    // ----------------------------------------------------
    // C. Re-arrastrar elementos en el Canvas (D&D Secundario)
    // ----------------------------------------------------

    // Función para hacer que los elementos dentro del canvas se puedan mover
    function makeElementDraggable(element) {
        let isDragging = false;
        let offset = { x: 0, y: 0 }; // Distancia del cursor al borde de la imagen

        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Solo clic izquierdo
            isDragging = true;
            offset.x = e.clientX - element.getBoundingClientRect().left;
            offset.y = e.clientY - element.getBoundingClientRect().top;
            element.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Nueva posición relativa al canvas
            let newX = e.clientX - canvas.getBoundingClientRect().left - offset.x;
            let newY = e.clientY - canvas.getBoundingClientRect().top - offset.y;

            // Opcional: Limitar el movimiento para que no salga del canvas
            // if (newX < 0) newX = 0;
            // if (newY < 0) newY = 0;

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';
            }
        });

        // Req 5: Evento de ratón (Clic derecho para borrar)
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Evita que aparezca el menú contextual del navegador
            if (confirm(`¿Eliminar ${element.alt} del outfit?`)) {
                element.remove();
            }
        });
    }


    // ----------------------------------------------------
    // D. Funciones de Control
    // ----------------------------------------------------

    // Limpiar canvas
    document.getElementById('clearCanvas').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar el outfit?')) {
            canvas.querySelectorAll('.outfit-item').forEach(item => item.remove());
        }
    });

    // Función para recolectar datos del canvas
    function collectOutfitData() {
        const outfitItems = [];
        const itemsOnCanvas = canvas.querySelectorAll('.outfit-item');

        itemsOnCanvas.forEach(item => {
            // Asegúrate de que las coordenadas sean números
            const x = parseFloat(item.style.left);
            const y = parseFloat(item.style.top);

            outfitItems.push({
                garmentId: parseInt(item.dataset.garmentId),
                x: x,
                y: y
            });
        });

        return outfitItems;
    }


// Req 5: Eventos de Teclado (2)

    document.addEventListener('keydown', (e) => {
        // 1. Usar ESC para cerrar la modal de confirmación
        if (e.key === 'Escape' && document.querySelector('.modal.show')) {
            // Simular clic en el botón de cerrar de Bootstrap (si usas modales de Bootstrap)
            // Por ahora, solo loguearemos:
            console.log('Evento de teclado: ESC presionado.');
        }

        // 2. Usar teclas de flecha para mover la prenda seleccionada (focus)
        const activeItem = document.activeElement;
        if (activeItem && activeItem.classList.contains('outfit-item')) {
            let x = parseFloat(activeItem.style.left);
            let y = parseFloat(activeItem.style.top);
            const step = 5; // Pixeles de movimiento

            switch (e.key) {
                case 'ArrowUp': y -= step; e.preventDefault(); break;
                case 'ArrowDown': y += step; e.preventDefault(); break;
                case 'ArrowLeft': x -= step; e.preventDefault(); break;
                case 'ArrowRight': x += step; e.preventDefault(); break;
                default: return;
            }

            activeItem.style.left = `${x}px`;
            activeItem.style.top = `${y}px`;
        }
    });


// public/js/outfit-builder.js (AGREGAR AL FINAL)

// Req 5: Evento de Animación (1)
    function showSuccessAnimation(message) {
        const popup = document.createElement('div');
        popup.classList.add('success-popup');
        popup.textContent = message;

        // Agregarlo al body
        document.body.appendChild(popup);

        // Escuchar el evento de fin de animación
        popup.addEventListener('animationend', (e) => {
            // Eliminar el elemento del DOM al finalizar (limpieza)
            if (e.animationName === 'fadeOut') {
                popup.remove();
                console.log('Evento de animación: popup eliminado del DOM.');
            }
        });
    }

    // ----------------------------------------------------
    // LÓGICA DE CARGA Y GUARDADO (Update)
    // ----------------------------------------------------

    // Función para limpiar el Canvas y resetear el estado de edición
    const clearCanvas = () => {
        canvas.querySelectorAll('.outfit-item').forEach(item => item.remove());
        currentOutfitId = null;
        currentOutfitName = 'Nuevo Outfit';
        console.log("Canvas limpiado. Modo: Guardar nuevo.");
    };

    // 1. Guardar Outfit (MODIFICAR para manejar POST/PUT)
    saveOutfitBtn.addEventListener('click', async () => {
        const items = collectOutfitData();
        if (items.length === 0) { alert('El canvas está vacío.'); return; }

        let outfitName = prompt(`Ingresa un nombre para tu outfit (Actual: ${currentOutfitName}):`, currentOutfitName);
        if (!outfitName || outfitName.trim() === '') return;

        let url = '/outfits';
        let method = 'POST';

        // Si hay un ID, cambiamos a modo UPDATE (PUT)
        if (currentOutfitId) {
            url = `/outfits/${currentOutfitId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outfitName: outfitName.trim(),
                    items: items
                })
            });
            // ... (manejo de respuesta y animación de éxito) ...
            const result = await response.json();

            if (result.success) {
                showSuccessAnimation(currentOutfitId ? 'Outfit Actualizado!' : 'Outfit Guardado!');
                // Si fue POST, guardamos el ID para futuras ediciones
                if (method === 'POST') currentOutfitId = result.outfitId;
                currentOutfitName = outfitName.trim();

            } else {
                alert(`Error al ${method === 'POST' ? 'guardar' : 'actualizar'}: ` + result.message);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error de conexión.');
        }
    });

    // 2. Cargar Outfit para Edición (NUEVA LÓGICA)
    const editButtons = document.querySelectorAll('.edit-outfit-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.outfitId;

            if (currentOutfitId && currentOutfitId != id) {
                if (!confirm(`Ya estás editando el outfit ID ${currentOutfitId}. ¿Deseas descartar los cambios y cargar el nuevo?`)) {
                    return;
                }
            }

            try {
                const response = await fetch(`/outfits/${id}`);
                const data = await response.json();

                if (data.success) {
                    clearCanvas(); // Limpiar el canvas actual
                    loadOutfitToCanvas(id, data.name, data.items);
                    alert(`Outfit "${data.name}" cargado para edición.`);
                } else {
                    alert('Error al cargar el outfit: ' + data.message);
                }
            } catch (error) {
                alert('Error de red al cargar el outfit.');
            }
        });
    });

    // 3. Función para dibujar el outfit cargado
    function loadOutfitToCanvas(id, name, items) {
        currentOutfitId = id;
        currentOutfitName = name;

        items.forEach(item => {
            // ... (código para crear y posicionar img, y hacerla draggable) ...
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = `Prenda ID ${item.garmentId}`;

            // Replicar las propiedades del D&D:
            img.classList.add('outfit-item');
            img.style.position = 'absolute';
            img.style.left = `${item.x}px`;
            img.style.top = `${item.y}px`;
            img.style.width = '100px';
            img.style.cursor = 'move';
            img.dataset.garmentId = item.garmentId;
            makeElementDraggable(img);

            canvas.appendChild(img);
        });
    }

    // 4. Limpiar canvas (USAR LA FUNCIÓN GLOBAL)
    document.getElementById('clearCanvas').addEventListener('click', clearCanvas);


    // ----------------------------------------------------
// E. LÓGICA DE INICIALIZACIÓN DE EDICIÓN (Al cargar la página)
// ----------------------------------------------------

    function initializeEditMode() {
        // 1. Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');

        if (editId) {
            console.log(`Modo Edición Activado para Outfit ID: ${editId}`);
            fetchOutfitAndLoad(editId);
        }
    }

    async function fetchOutfitAndLoad(id) {
        try {
            const response = await fetch(`/outfits/${id}`);

            if (!response.ok) {
                alert('Error al cargar outfit: No se encontró el outfit o error del servidor.');
                return;
            }

            const data = await response.json();

            if (data.success) {
                clearCanvas(); // Limpiar antes de cargar el nuevo
                loadOutfitToCanvas(id, data.name, data.items);
                alert(`Outfit "${data.name}" cargado para edición.`);

                // Opcional: Limpiar el query string para que al recargar no se cargue dos veces
                history.replaceState(null, '', location.pathname);

            } else {
                alert('Error al cargar el outfit: ' + data.message);
            }
        } catch (error) {
            console.error('Error de red al cargar el outfit:', error);
            alert('Error de conexión al cargar el outfit.');
        }
    }
    initializeEditMode();


    // Función para añadir mensajes al contenedor de chat
    function addMessage(sender, text, isAI = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('p-2', 'mb-2', 'small');
        messageDiv.style.borderRadius = '10px';

        if (isAI) {
            messageDiv.classList.add('alert', 'alert-info');
            messageDiv.innerHTML = `<strong>Eros Bot:</strong> ${text}`;
        } else {
            messageDiv.classList.add('text-end');
            messageDiv.style.backgroundColor = '#EAEAEA';
            messageDiv.innerHTML = `<strong>Tú:</strong> ${text}`;
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll al final
    }

    // Manejar el envío del formulario del chat
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = userInput.value.trim();

            if (!message) return;

            addMessage('user', message, false);
            userInput.value = '';

            // Mostrar indicador de carga
            sendBtn.disabled = true;
            sendBtn.textContent = '...';

            try {
                const response = await fetch('/api/style-advice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });

                const result = await response.json();

                if (result.success) {
                    addMessage('ai', result.advice, true);
                } else {
                    addMessage('ai', `[ERROR]: ${result.message}`, true);
                }

            } catch (error) {
                console.error('Fallo en la comunicación con el AI:', error);
                addMessage('ai', 'Fallo de conexión con el servidor. Por favor, verifica tu red.', true);
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Enviar';
            }
        });
    }

    // Limpiar el chat al cerrar el modal (opcional)
    if (modal) {
        modal.addEventListener('hidden.bs.modal', function () {
            // Limpiar todo excepto el mensaje inicial de bienvenida
            const welcomeMessage = chatMessages.querySelector('.alert-info');
            chatMessages.innerHTML = '';
            chatMessages.appendChild(welcomeMessage.cloneNode(true));
        });
    }

});


