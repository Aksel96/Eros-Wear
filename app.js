// app.js (VERSION CORREGIDA)
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

// NOTA: Se eliminó 'const hbs = require('express-handlebars');' ya que no se usa.

// 1. Inicialización
const app = express();
require('./database/db');

// 2. Configuración (Settings)
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));

// Handlebars
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',

    // Bloque de Helpers correcto
    helpers: {
        json: function (context) { return JSON.stringify(context); },
        isOwner: function (userId, creatorId) { return userId === creatorId; },
        dateFormat: function (date) {
            if (!date) return 'N/A';
            return new Date(date).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        },
        eq: function (v1, v2) {
            return v1 === v2;
        },
        formatDateShort: function (date) {
            if (!date) return '';

            // Crea un objeto Date. El formato de la DB se parsea automáticamente.
            const d = new Date(date);

            if (isNaN(d.getTime())) {
                return date; // Retorna el valor original si la fecha es inválida
            }

            // Opciones de formato: mes, día, año, hora y minuto
            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true // Formato de 12 horas con AM/PM
            };

            // Usa 'en-US' para el formato MM/DD/YYYY y 'es-MX' o 'es-ES' si prefieres DD/MM/YYYY
            // Usaremos 'en-US' para lograr el formato más directo.
            return d.toLocaleString('es-ES', options);
        },
    }
}));
app.set('view engine', '.hbs');

// 3. Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sessiones y Flash deben ir antes de las Variables Globales
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(flash());


// ******************************************************
// AHORA LAS VARIABLES GLOBALES ESTÁN EN EL LUGAR CORRECTO
// ******************************************************
app.use((req, res, next) => {
    // Estas variables ahora se inyectan en res.locals ANTES de que se ejecute cualquier ruta.
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user; // <-- EL CRUCIAL res.locals.user
    next();
});


// 4. Archivos Estáticos (Public)
app.use(express.static(path.join(__dirname, 'public')));

// 5. Rutas (Routes) - Las rutas deben ir después de todos los middlewares.
app.use(require('./routes/index.routes'));
app.use(require('./routes/auth.routes'));

// 6. Arrancar Servidor
app.listen(app.get('port'), () => {
    console.log(`🚀 Servidor en puerto http://localhost:${app.get('port')}`);
});

// ******************************************************
// El bloque hbs.create() REDUNDANTE ha sido ELIMINADO.
// ******************************************************
