-- =====================================================================
-- Eros Wear · Esquema de base de datos (MySQL 8 / TiDB compatible)
-- Reconstruido a partir de las consultas de controllers/*.js
-- Ejecuta este archivo primero y después seed.sql
--   npm run db:init       (lo hace todo por ti)
-- =====================================================================

SET NAMES utf8mb4;

-- Orden inverso de dependencias para poder re-ejecutar el script
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS garment_sizes;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS outfit_items;
DROP TABLE IF EXISTS outfits;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS garments;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- Usuarios (registro / login)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nickname      VARCHAR(50)  NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_nickname (nickname),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Prendas del catálogo
-- category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'model'
-- ('model' es el maniquí base y se excluye del catálogo)
-- ---------------------------------------------------------------------
CREATE TABLE garments (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    category   ENUM('top','bottom','shoes','accessory','model') NOT NULL,
    image_url  VARCHAR(255) NOT NULL,
    price      DECIMAL(10,2) NOT NULL DEFAULT 0,        -- MXN, IVA incluido
    description VARCHAR(500) NULL,
    material   VARCHAR(150) NULL,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_garments_name (name),
    KEY idx_garments_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Prendas que cada usuario agregó a su probador ("favoritos")
-- La PK compuesta permite el INSERT ... ON DUPLICATE KEY UPDATE
-- ---------------------------------------------------------------------
CREATE TABLE user_favorites (
    user_id    INT UNSIGNED NOT NULL,
    garment_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, garment_id),
    KEY idx_fav_garment (garment_id),
    CONSTRAINT fk_fav_user    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
    CONSTRAINT fk_fav_garment FOREIGN KEY (garment_id) REFERENCES garments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Outfits creados en el probador
-- ---------------------------------------------------------------------
CREATE TABLE outfits (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    name        VARCHAR(100) NOT NULL,
    likes_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_outfits_user (user_id),
    KEY idx_outfits_likes (likes_count),
    KEY idx_outfits_created (created_at),
    CONSTRAINT fk_outfit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Prendas colocadas dentro de un outfit (posición en el lienzo)
-- ---------------------------------------------------------------------
CREATE TABLE outfit_items (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    outfit_id  INT UNSIGNED NOT NULL,
    garment_id INT UNSIGNED NOT NULL,
    position_x DECIMAL(8,2) NOT NULL DEFAULT 0,
    position_y DECIMAL(8,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_items_outfit (outfit_id),
    KEY idx_items_garment (garment_id),
    CONSTRAINT fk_item_outfit  FOREIGN KEY (outfit_id)  REFERENCES outfits (id)  ON DELETE CASCADE,
    CONSTRAINT fk_item_garment FOREIGN KEY (garment_id) REFERENCES garments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Likes (un like por usuario y outfit)
-- ---------------------------------------------------------------------
CREATE TABLE likes (
    user_id    INT UNSIGNED NOT NULL,
    outfit_id  INT UNSIGNED NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, outfit_id),
    KEY idx_likes_outfit (outfit_id),
    CONSTRAINT fk_like_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
    CONSTRAINT fk_like_outfit FOREIGN KEY (outfit_id) REFERENCES outfits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Existencias por talla. Una prenda sin filas aquí no se puede pedir.
-- Para cambiar stock: UPDATE garment_sizes SET stock = 5 WHERE garment_id = 3 AND size = 'M';
-- ---------------------------------------------------------------------
CREATE TABLE garment_sizes (
    garment_id INT UNSIGNED NOT NULL,
    size       VARCHAR(10)  NOT NULL,
    stock      INT UNSIGNED NOT NULL DEFAULT 0,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (garment_id, size),
    CONSTRAINT fk_size_garment FOREIGN KEY (garment_id) REFERENCES garments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Pedidos enviados por WhatsApp (registro para dar seguimiento; no hay cobro en línea)
-- status: pendiente | confirmado | entregado | cancelado
-- ---------------------------------------------------------------------
CREATE TABLE orders (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    reference     VARCHAR(20)  NOT NULL,
    user_id       INT UNSIGNED NULL,
    customer_name VARCHAR(100) NOT NULL,
    notes         VARCHAR(500) NULL,
    total         DECIMAL(10,2) NOT NULL,
    status        ENUM('pendiente','confirmado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_reference (reference),
    KEY idx_orders_status (status),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id    INT UNSIGNED NOT NULL,
    garment_id  INT UNSIGNED NULL,
    name        VARCHAR(100) NOT NULL,
    size        VARCHAR(10)  NOT NULL,
    quantity    INT UNSIGNED NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_oitems_order (order_id),
    CONSTRAINT fk_oitem_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE CASCADE,
    CONSTRAINT fk_oitem_garment FOREIGN KEY (garment_id) REFERENCES garments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
