// public/js/validation.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    if (!form) return; // Salir si el formulario no existe en la página actual

    const nicknameInput = document.getElementById('nickname');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');

    // El evento 'submit' se dispara cuando el usuario intenta enviar el formulario
    form.addEventListener('submit', (e) => {
        let isValid = true;

        // Limpiar estilos de Bootstrap antes de validar
        [nicknameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });

        // 1. Validar Apodo (mínimo 3 caracteres)
        if (nicknameInput.value.trim().length < 3) {
            displayError(nicknameInput, 'El apodo debe tener al menos 3 caracteres.', 'nicknameFeedback');
            isValid = false;
        } else {
            displaySuccess(nicknameInput);
        }

        // 2. Validar Email
        if (!validateEmail(emailInput.value)) {
            displayError(emailInput, 'Introduce un correo electrónico válido.', 'emailFeedback');
            isValid = false;
        } else {
            displaySuccess(emailInput);
        }

        // 3. Validar Contraseña (mínimo 6 caracteres, mayúsculas, minúsculas, números)
        const passValidation = validatePassword(passwordInput.value);
        if (!passValidation.valid) {
            displayError(passwordInput, passValidation.message, 'passwordFeedback');
            isValid = false;
        } else {
            displaySuccess(passwordInput);
        }

        // 4. Validar Confirmación de Contraseña
        if (passwordInput.value !== confirmPasswordInput.value || confirmPasswordInput.value === '') {
            displayError(confirmPasswordInput, 'Las contraseñas no coinciden.', 'confirmPasswordFeedback');
            isValid = false;
        } else {
            displaySuccess(confirmPasswordInput);
        }


        if (!isValid) {
            e.preventDefault(); // Detiene el envío si la validación falla
            // Mueve el foco al primer campo con error
            const firstInvalid = form.querySelector('.is-invalid');
            if(firstInvalid) firstInvalid.focus();
        }
    });

    // Funciones auxiliares

    function validateEmail(email) {
        // Expresión regular para validar el formato básico del email
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function validatePassword(password) {
        if (password.length < 6) {
            return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Debe incluir al menos una mayúscula.' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Debe incluir al menos una minúscula.' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Debe incluir al menos un número.' };
        }
        return { valid: true };
    }

    function displayError(inputElement, message, feedbackId) {
        inputElement.classList.add('is-invalid');
        document.getElementById(feedbackId).textContent = message;
    }

    function displaySuccess(inputElement) {
        inputElement.classList.add('is-valid');
    }
});