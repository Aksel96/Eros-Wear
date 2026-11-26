// controllers/auth.controller.js
const db = require('../database/db');
const bcrypt = require('bcryptjs');

const authController = {};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authController.renderRegister = (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { title: 'Crear cuenta', authPage: true });
};

authController.renderLogin = (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { title: 'Iniciar sesión', authPage: true });
};

authController.register = async (req, res) => {
    const nickname = (req.body.nickname || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!nickname || !email || !password) {
        req.flash('error_msg', 'Por favor, rellena todos los campos.');
        return res.redirect('/register');
    }
    if (nickname.length < 3 || nickname.length > 50) {
        req.flash('error_msg', 'El apodo debe tener entre 3 y 50 caracteres.');
        return res.redirect('/register');
    }
    if (!EMAIL_RE.test(email)) {
        req.flash('error_msg', 'Introduce un correo electrónico válido.');
        return res.redirect('/register');
    }
    if (password.length < 6) {
        req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres.');
        return res.redirect('/register');
    }

    try {
        const [existing] = await db.query(
            'SELECT email, nickname FROM users WHERE email = ? OR nickname = ?',
            [email, nickname]
        );

        if (existing.length > 0) {
            const emailTaken = existing.some(u => u.email.toLowerCase() === email);
            req.flash('error_msg', emailTaken
                ? 'El correo electrónico ya está registrado.'
                : 'El apodo ya está en uso.');
            return res.redirect('/register');
        }

        const password_hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (nickname, email, password_hash) VALUES (?, ?, ?)',
            [nickname, email, password_hash]
        );

        req.flash('success_msg', 'Cuenta creada. Ya puedes iniciar sesión.');
        res.redirect('/login');
    } catch (error) {
        console.error('Error al registrar usuario:', error.message);
        req.flash('error_msg', 'Ocurrió un error al crear tu cuenta. Intenta de nuevo.');
        res.redirect('/register');
    }
};

authController.login = async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        req.flash('error_msg', 'Introduce tu correo y contraseña.');
        return res.redirect('/login');
    }

    try {
        const [users] = await db.query(
            'SELECT id, nickname, email, password_hash FROM users WHERE email = ?',
            [email]
        );
        const user = users[0];
        const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!isMatch) {
            req.flash('error_msg', 'Correo o contraseña incorrectos.');
            return res.redirect('/login');
        }

        // Nueva sesión tras autenticarse (evita fijación de sesión)
        req.session.regenerate(err => {
            if (err) {
                console.error('Error al crear la sesión:', err.message);
                req.flash('error_msg', 'No pudimos iniciar tu sesión. Intenta de nuevo.');
                return res.redirect('/login');
            }
            req.session.user = { id: user.id, nickname: user.nickname, email: user.email };
            req.flash('success_msg', `Bienvenido/a de nuevo, ${user.nickname}.`);
            req.session.save(() => res.redirect('/'));
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        req.flash('error_msg', 'Ocurrió un error en el servidor.');
        res.redirect('/login');
    }
};

authController.logout = (req, res) => {
    req.session.regenerate(() => {
        req.flash('success_msg', 'Cerraste tu sesión. ¡Vuelve pronto!');
        req.session.save(() => res.redirect('/'));
    });
};

// Protege rutas que requieren sesión. Responde JSON a peticiones fetch.
authController.isLoggedIn = (req, res, next) => {
    if (req.session.user) return next();

    const wantsJson = req.xhr || (req.get('Accept') || '').includes('application/json') || req.is('application/json');
    if (wantsJson) {
        return res.status(401).json({ success: false, message: 'Necesitas iniciar sesión para hacer esto.' });
    }
    req.flash('error_msg', 'Necesitas iniciar sesión para acceder a esta función.');
    res.redirect('/login');
};

module.exports = authController;
