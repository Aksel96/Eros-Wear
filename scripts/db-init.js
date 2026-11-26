// scripts/db-init.js
// Crea las tablas y carga los datos iniciales en la base configurada en .env
// Uso: npm run db:init            (esquema + datos)
//      npm run db:init -- --schema-only
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
process.env.NODE_ENV = process.env.NODE_ENV || 'test'; // evita el log de conexión del pool
const { buildConfig } = require('../database/db');

async function run() {
    const schemaOnly = process.argv.includes('--schema-only');
    const files = ['schema.sql'].concat(schemaOnly ? [] : ['seed.sql']);
    const config = buildConfig({ multipleStatements: true });
    ['waitForConnections', 'connectionLimit', 'queueLimit'].forEach(k => delete config[k]);
    const conn = await mysql.createConnection(config);
    try {
        for (const file of files) {
            const sql = fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8');
            process.stdout.write(`Ejecutando ${file}... `);
            await conn.query(sql);
            console.log('listo');
        }
        const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM garments');
        console.log(`Base de datos lista. Prendas en el catálogo: ${total}`);
    } finally {
        await conn.end();
    }
}

run().then(() => process.exit(0)).catch(err => {
    console.error('\nError inicializando la base de datos:', err.message);
    process.exit(1);
});
