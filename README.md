# Eros Wear

Elegancia audaz con corazón mexicano. Eros Wear es una tienda-estudio de moda donde puedes explorar el catálogo, combinar prendas en un probador visual y compartir tus outfits con la comunidad.

- **Catálogo** con filtros por categoría, búsqueda y orden por popularidad.
- **Probador**: arrastra o toca prendas para colocarlas en el lienzo, muévelas (ratón o táctil), y guarda o edita tus outfits.
- **Galería** con likes (uno por persona) y la opción de usar outfits ajenos como inspiración.
- **Comunidad** con ranking de creadores.

Stack: Node.js 18+, Express 4, Handlebars, Bootstrap 5 y MySQL 8 (compatible con TiDB).

## Desarrollo local

```bash
npm install
cp .env.example .env        # completa las variables
npm run db:init             # crea las tablas y carga el catálogo
npm run dev                 # http://localhost:3000
```

`npm run db:init` ejecuta `database/schema.sql` y `database/seed.sql`. **Borra y recrea las tablas**, así que úsalo solo al configurar una base nueva. Con `npm run db:init -- --schema-only` se crean las tablas vacías, sin datos.

Las sesiones se guardan en la tabla `sessions` de la misma base; se crea sola al arrancar.

## Base de datos

| Archivo | Contenido |
| --- | --- |
| `database/schema.sql` | Tablas `users`, `garments`, `user_favorites`, `outfits`, `outfit_items` y `likes`, con llaves foráneas y borrado en cascada. |
| `database/seed.sql` | Las 59 prendas del catálogo (imágenes en `public/img/garments`) y la cuenta de la marca **ErosStudio** con 6 outfits de muestra. Esa cuenta no tiene una contraseña utilizable. |

### Hosting recomendado: TiDB Cloud Starter (gratis)

La app usa MySQL. TiDB Cloud Starter es compatible con MySQL, tiene un plan gratuito sin tarjeta y funciona bien con Render.

1. Crea una cuenta en <https://tidbcloud.com> y un clúster **Starter**. Elige una región de AWS cercana a tu servicio de Render (por ejemplo `us-east-1` o `us-west-2`).
2. En el clúster, pulsa **Connect**, genera una contraseña y copia los datos de conexión (host, puerto `4000`, usuario con prefijo tipo `xxxx.root`).
3. Crea la base: en **SQL Editor** ejecuta `CREATE DATABASE eros_wear;`.
4. Desde tu computadora, crea un `.env` con esos datos y `DB_SSL=true`, y ejecuta `npm run db:init`. (También puedes pegar `schema.sql` y luego `seed.sql` en el SQL Editor).
5. En Render, abre tu Web Service → **Environment** y agrega:

   | Variable | Valor |
   | --- | --- |
   | `DB_HOST` | host de TiDB (`gateway01.<región>.prod.aws.tidbcloud.com`) |
   | `DB_PORT` | `4000` |
   | `DB_USER` | usuario de TiDB |
   | `DB_PASS` | contraseña de TiDB |
   | `DB_NAME` | `eros_wear` |
   | `DB_SSL` | `true` |
   | `SESSION_SECRET` | una cadena larga y aleatoria |
   | `NODE_ENV` | `production` |

   En lugar de las cinco primeras puedes usar solo `DATABASE_URL=mysql://usuario:contraseña@host:4000/eros_wear`.

6. Guarda los cambios; Render vuelve a desplegar y la app se conecta sola.

En Render, el *Build Command* es `npm install` y el *Start Command* es `npm start`.

**Otras opciones:** Aiven retiró su MySQL gratuito en noviembre de 2026; su plan *Developer* (unos 5 USD al mes) funciona con esta app usando `DB_SSL=true` y su certificado en `DB_SSL_CA`. Cualquier MySQL 8 sirve sin cambios de código.

## Estructura

```
app.js                  servidor Express, sesiones y manejo de errores
controllers/            lógica de autenticación, catálogo y outfits
routes/                 rutas
lib/                    helpers de Handlebars y utilidades de outfits
database/               conexión, esquema y datos iniciales
scripts/db-init.js      inicializa la base
views/                  vistas Handlebars (layout + parciales)
public/                 CSS, JS del navegador e imágenes
```
