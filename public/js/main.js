// public/js/main.js (NUEVO ARCHIVO)

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar-custom');
    if (!navbar) return; // Asegurar que solo corra donde existe el navbar

    // Función para cambiar la clase del navbar al scrollear
    function toggleNavbar() {
        // Umbral de scroll (50px)
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }



    // public/js/main.js (AÑADIR LÓGICA DE NEWSLETTER)

// ... (después de la lógica de toggleNavbar) ...


    // ----------------------------------------------------
    // Lógica de Suscripción (Newsletter)
    // ----------------------------------------------------
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterMessage = document.getElementById('newsletter-message');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');

            if (emailInput.value) {
                // Simulación de envío de datos al backend
                newsletterMessage.classList.remove('text-danger');
                newsletterMessage.classList.add('text-success');
                newsletterMessage.textContent = `¡Gracias por suscribirte, ${emailInput.value}! Pronto recibirás noticias de Eros Wear.`;

                emailInput.value = '';

                // Opcional: Deshabilitar el botón por un momento
                const submitButton = newsletterForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                setTimeout(() => {
                    submitButton.disabled = false;
                    newsletterMessage.textContent = ''; // Limpiar mensaje
                }, 4000);

            } else {
                newsletterMessage.classList.remove('text-success');
                newsletterMessage.classList.add('text-danger');
                newsletterMessage.textContent = 'Por favor, introduce un correo electrónico válido.';
            }
        });
    }


// Adjuntar los listeners
    window.addEventListener('scroll', toggleNavbar);
    toggleNavbar(); // Ejecutar una vez al cargar para verificar la posición inicial

});


