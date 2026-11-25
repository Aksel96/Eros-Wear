// app.js · Eros Wear
require('dotenv').config({ quiet: true });

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('connect-flash');
const compression = require('compression');

const db = require('./database/db');
const helpers = require('./lib/hbs-helpers');
const store = require('./lib/store');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Render sirve la app detrás de un proxy HTTPS
app.disable('x-powered-by');

app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers
}));
app.set('view engine', '.hbs');

// ---------------------------------------------------------------------
// Middlewares
// ---------------------------------------------------------------------
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: isProd ? '7d' : 0
}));
// Bootstrap servido desde node_modules (sin depender de un CDN externo)
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist'), {
    maxAge: isProd ? '30d' : 0
}));

if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET no está definido; usando un valor temporal. Defínelo en producción.');
}

app.use(session({
    name: 'eros.sid',
    secret: process.env.SESSION_SECRET || 'eros-wear-dev-secret',
    store: new MySQLStore({ createDatabaseTable: true }, db),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
    }
}));
app.use(flash());

// Variables globales para las vistas
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user;
    res.locals.currentPath = req.path;
    res.locals.year = new Date().getFullYear();
    res.locals.whatsappEnabled = Boolean(store.getWhatsappNumber());
    res.locals.whatsappUrl = store.getWhatsappNumber() ? `https://wa.me/${store.getWhatsappNumber()}` : null;
    next();
});

// ---------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------
app.use(require('./routes/index.routes'));
app.use(require('./routes/auth.routes'));

// 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// Errores no controlados
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Error no controlado:', err);
    if (req.accepts('html')) {
        return res.status(500).render('404', {
            title: 'Algo salió mal',
            code: '500',
            message: 'Tuvimos un problema al procesar tu solicitud. Intenta de nuevo en un momento.'
        });
    }
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

app.listen(app.get('port'), () => {
    console.log(`Eros Wear escuchando en http://localhost:${app.get('port')}`);
});
