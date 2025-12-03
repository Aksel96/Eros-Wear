// controllers/auth.controller.js (VERSION CORREGIDA)

const db = require('../database/db');
const bcrypt = require('bcryptjs');

const authController = {};

/**
 * Procesa la solicitud POST de registro de usuario
 */
authController.register = async (req, res) => {
    // 1. Obtener datos del formulario
    const { nickname, email, password } = req.body;

    // 2. Validación básica en el servidor
    if (!nickname || !email || !password) {
        req.flash('error_msg', 'Por favor, rellena todos los campos.');
        return res.redirect('/register');
    }

    let conn;
    try {
        conn = await db.getConnection();

        // 4. Verificar si el usuario o el apodo ya existen
        const [existingUsers] = await conn.query(
            'SELECT email, nickname FROM users WHERE email = ? OR nickname = ?',
            [email, nickname]
        );

        if (existingUsers.length > 0) {
            const userExists = existingUsers.find(u => u.email === email);
            const nicknameExists = existingUsers.find(u => u.nickname === nickname);

            if (userExists) {
                req.flash('error_msg', 'El correo electrónico ya está registrado.');
            } else if (nicknameExists) {
                req.flash('error_msg', 'El apodo ya está en uso.');
            }
            return res.redirect('/register');
        }

        // 5. Hashing de Contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 6. Inserción en la Base de Datos
        await conn.query(
            'INSERT INTO users (nickname, email, password_hash) VALUES (?, ?, ?)',
            [nickname, email, password_hash]
        );

        // 7. Registro de éxito
        req.flash('success_msg', 'Registro exitoso. ¡Ahora puedes iniciar sesión!');
        res.redirect('/login');


        console.log(`[AUDITORÍA]: Registro exitoso. Nuevo Usuario: ${nickname}, Email: ${email}`);

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        req.flash('error_msg', 'Ocurrió un error al intentar registrarte.');
        res.redirect('/register');
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Muestra el formulario de inicio de sesión (GET /login)
 */
authController.renderLogin = (req, res) => {
    res.render('login');
};


/**
 * Procesa la solicitud POST de inicio de sesión (POST /login)
 */
authController.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error_msg', 'Por favor, introduce tu correo y contraseña.');
        return res.redirect('/login');
    }

    let conn;
    try {
        conn = await db.getConnection();

        // 1. Buscar usuario por email
        const [users] = await conn.query('SELECT id, nickname, email, password_hash FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            req.flash('error_msg', 'Credenciales incorrectas.');
            return res.redirect('/login');
        }

        const user = users[0];

        // 2. Comparar la contraseña ingresada con el hash almacenado
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            // 3. Crear Sesión y guardar datos de usuario
            req.session.user = {
                id: user.id,
                nickname: user.nickname,
                email: user.email
            };
// **********************************************
            // 4. GUARDADO EXPLÍCITO DE SESIÓN Y REDIRECCIÓN
            // **********************************************
            req.session.save(err => {
                if (err) {
                    console.error('Error al guardar la sesión:', err);
                    req.flash('error_msg', 'Error al crear la sesión.');
                    return res.redirect('/login');
                }

                // Si el guardado es exitoso, redirigimos.
                req.flash('success_msg', `Bienvenido/a de nuevo, ${user.nickname}.`);
                return res.redirect('/'); // Redirigir a la página principal
            });
        } else {
            req.flash('error_msg', 'Credenciales incorrectas.');
            return res.redirect('/login');
        }

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        req.flash('error_msg', 'Ocurrió un error en el servidor.');
        res.redirect('/login');
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Cierra la sesión del usuario
 */
authController.logout = (req, res) => {
    // 1. LLAMAR A req.flash() ANTES DE DESTRUIR LA SESIÓN
    req.flash('success_msg', 'Has cerrado tu sesión.');

    // 2. Destruir la sesión (el mensaje ya está guardado)
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            // Si falla la destrucción, aún podemos redirigir.
        }

        // 3. Redirigir (el middleware de flash lo enviará a la vista /login)
        res.redirect('/login');
    });
};
// Middleware para asegurar que el usuario esté logueado antes de acceder a una ruta
authController.isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        // Si hay usuario en sesión, permite continuar
        return next();
    }
    // Si no está logueado, redirige al login con mensaje
    req.flash('error_msg', 'Necesitas iniciar sesión para acceder a esta función.');
    res.redirect('/login');
};


module.exports = authController;