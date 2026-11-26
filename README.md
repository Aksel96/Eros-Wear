# Eros Wear

Elegancia audaz con corazón mexicano. Eros Wear es un catálogo interactivo de moda: exploras prendas con precio y stock por talla, armas tu carrito y envías el pedido por WhatsApp. **No hay pago en línea**: la marca confirma disponibilidad, cobro y entrega por mensaje.

- **Catálogo y producto** con precios, tallas con stock, filtros, búsqueda y efectos (inclinación 3D, zoom).
- **Carrito** guardado en el navegador; el servidor revisa precio y stock reales al enviar.
- **Pedidos por WhatsApp:** se registran en la base (tabla `orders`) y abren WhatsApp con el mensaje ya armado.
- **Probador**: arrastra o toca prendas para colocarlas en el lienzo, muévelas (ratón o táctil), y guarda o edita tus outfits.
- **Galería** con likes (uno por persona) y la opción de usar outfits ajenos como inspiración.
- **Comunidad** con ranking de creadores.

Stack: Node.js 18+, Express 4, Handlebars, CSS propio (mobile-first, sin frameworks) y MySQL 8 (compatible con TiDB).

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
| `database/schema.sql` | Tablas `users`, `garments` (con precio), `garment_sizes` (stock por talla), `orders`, `order_items`, `user_favorites`, `outfits`, `outfit_items` y `likes`. |
| `database/seed.sql` | Las 59 prendas del catálogo (imágenes en `public/img/garments`), sus tallas con **precios, descripciones y stock de ejemplo**, y la cuenta de la marca **ErosStudio** con 6 outfits de muestra. Esa cuenta no tiene una contraseña utilizable. |

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
   | `WHATSAPP_NUMBER` | tu número en formato internacional, solo dígitos (México celular: `521` + 10 dígitos) |

   En lugar de las cinco primeras puedes usar solo `DATABASE_URL=mysql://usuario:contraseña@host:4000/eros_wear`.

6. Guarda los cambios; Render vuelve a desplegar y la app se conecta sola.

En Render, el *Build Command* es `npm install` y el *Start Command* es `npm start`.

**Otras opciones:** Aiven retiró su MySQL gratuito en noviembre de 2026; su plan *Developer* (unos 5 USD al mes) funciona con esta app usando `DB_SSL=true` y su certificado en `DB_SSL_CA`. Cualquier MySQL 8 sirve sin cambios de código.

## Precios, stock y pedidos

Los precios, descripciones y existencias que trae el seed son **de ejemplo**. Para poner los reales, desde el SQL Editor de TiDB (o cualquier cliente MySQL):

```sql
-- precio y textos de una prenda (los ids están en database/seed.sql)
UPDATE garments SET price = 1299, description = 'Texto real', material = '100% algodón' WHERE id = 4;

-- stock por talla
UPDATE garment_sizes SET stock = 6 WHERE garment_id = 4 AND size = 'M';

-- ocultar una prenda del catálogo
UPDATE garments SET is_active = 0 WHERE id = 4;

-- ver los pedidos recibidos
SELECT o.reference, o.customer_name, o.total, o.status, o.created_at FROM orders o ORDER BY o.created_at DESC;
UPDATE orders SET status = 'confirmado' WHERE reference = 'EW-XXXXXX';
```

El stock **no se descuenta solo**: sirve para limitar lo que se puede pedir y mostrar "últimas piezas". Cuando confirmes un pedido por WhatsApp, ajusta `garment_sizes` a mano. Si `WHATSAPP_NUMBER` no está definido, el pedido igual se registra y el carrito muestra el texto para copiar.

## Estructura

```
app.js                  servidor Express, sesiones y manejo de errores
controllers/            lógica de autenticación, catálogo y outfits
routes/                 rutas
lib/                    helpers de Handlebars y utilidades de outfits
database/               conexión, esquema y datos iniciales
scripts/db-init.js      inicializa la base
views/                  vistas Handlebars (layout + parciales)
public/                 CSS (app.css), JS del navegador e imágenes
```
