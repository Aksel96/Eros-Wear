// database/db.js
// Pool de conexiones MySQL. Acepta DATABASE_URL (mysql://usuario:pass@host:puerto/db)
// o las variables sueltas DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME.
// Para proveedores en la nube que exigen TLS (TiDB Cloud, Aiven, etc.) usa DB_SSL=true.
const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

function buildSslConfig() {
    if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined;
    const ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    // Certificado de CA propio (p. ej. Aiven). Pega el PEM completo en DB_SSL_CA.
    if (process.env.DB_SSL_CA) ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
    return ssl;
}

function buildConfig(extra = {}) {
    const base = {
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
        queueLimit: 0,
        enableKeepAlive: true,
        ssl: buildSslConfig(),
        ...extra
    };

    if (process.env.DATABASE_URL) {
        return { uri: process.env.DATABASE_URL, ...base };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ...base
    };
}

const pool = mysql.createPool(buildConfig());

if (process.env.NODE_ENV !== 'test') {
    pool.getConnection()
        .then(conn => {
            console.log('Conexión a MySQL establecida.');
            conn.release();
        })
        .catch(err => console.error('No se pudo conectar a MySQL:', err.message));
}

module.exports = pool;
module.exports.buildConfig = buildConfig;
