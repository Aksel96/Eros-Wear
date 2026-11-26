// public/js/validation.js · Validación de formularios de acceso
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar / ocultar contraseña
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    });

    const form = document.getElementById('registrationForm');
    if (!form) return;

    const nickname = document.getElementById('nickname');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm_password');
    const bar = document.getElementById('strengthBar');

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function strength(value) {
        let score = 0;
        if (value.length >= 6) score++;
        if (value.length >= 10) score++;
        if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
        if (/\d/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;
        return score;
    }

    password.addEventListener('input', () => {
        const s = strength(password.value);
        const colors = ['#C62828', '#C62828', '#B7926F', '#B7926F', '#7953c5', '#5E35B1'];
        bar.style.width = `${(s / 5) * 100}%`;
        bar.style.background = colors[s];
    });

    function setState(input, feedbackId, message) {
        const fb = document.getElementById(feedbackId);
        input.classList.toggle('is-invalid', Boolean(message));
        input.classList.toggle('is-valid', !message);
        if (fb) fb.textContent = message || '';
    }

    function getChecks() {
        return [
            [nickname, 'nicknameFeedback', nickname.value.trim().length < 3 ? 'El apodo debe tener al menos 3 caracteres.' : ''],
            [email, 'emailFeedback', !EMAIL_RE.test(email.value.trim()) ? 'Introduce un correo electrónico válido.' : ''],
            [password, 'passwordFeedback',
                password.value.length < 6 ? 'Usa al menos 6 caracteres.'
                    : !(/[A-Z]/.test(password.value) && /[a-z]/.test(password.value) && /\d/.test(password.value))
                        ? 'Combina mayúsculas, minúsculas y números.' : ''],
            [confirm, 'confirmPasswordFeedback', !confirm.value || confirm.value !== password.value ? 'Las contraseñas no coinciden.' : '']
        ];
    }

    function validate() {
        let ok = true;
        getChecks().forEach(([input, fb, msg]) => {
            setState(input, fb, msg);
            if (msg) ok = false;
        });
        return ok;
    }

    form.addEventListener('submit', e => {
        if (!validate()) {
            e.preventDefault();
            const firstInvalid = form.querySelector('.is-invalid');
            if (firstInvalid) firstInvalid.focus();
        }
    });

    [nickname, email, password, confirm].forEach(input => {
        input.addEventListener('blur', () => {
            if (!input.value) return;
            const check = getChecks().find(([el]) => el === input);
            if (check) setState(...check);
        });
    });
});
