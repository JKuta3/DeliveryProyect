-- ============================================================================
-- FastMile Analytics - Esquema de Base de Datos MySQL
-- Archivo: DB/fastmile_db.sql
-- ============================================================================

-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS fastmile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fastmile_db;

-- ============================================================================
-- 1. Tabla: usuarios
-- ============================================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- En producción, usar bcrypt/argon2
    rol ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. Tabla: locales
-- ============================================================================
CREATE TABLE locales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    coord_x DECIMAL(5,2) NOT NULL CHECK (coord_x >= 0 AND coord_x <= 100),
    coord_y DECIMAL(5,2) NOT NULL CHECK (coord_y >= 0 AND coord_y <= 100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 3. Tabla: productos
-- ============================================================================
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    local_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
    nuevo_precio DECIMAL(10,2) NOT NULL, -- Se actualiza al aplicar descuento
    descuento_porcentaje INT DEFAULT 0 CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 99),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (local_id) REFERENCES locales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. Tabla: motociclistas
-- ============================================================================
CREATE TABLE motociclistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo_vehiculo ENUM('Moto', 'Bici') NOT NULL,
    placa_o_id VARCHAR(50) NOT NULL UNIQUE,
    estado ENUM('Libre', 'Ocupado') NOT NULL DEFAULT 'Libre',
    coord_x DECIMAL(5,2) NOT NULL CHECK (coord_x >= 0 AND coord_x <= 100),
    coord_y DECIMAL(5,2) NOT NULL CHECK (coord_y >= 0 AND coord_y <= 100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 5. Tabla: pedidos
-- ============================================================================
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    local_id INT NOT NULL,
    producto_id INT NOT NULL,
    motociclista_id INT DEFAULT NULL, -- Null hasta que se despacha
    cliente_x DECIMAL(5,2) NOT NULL,
    cliente_y DECIMAL(5,2) NOT NULL,
    distancia_km DECIMAL(10,2) DEFAULT 0.00,
    total_envio DECIMAL(10,2) DEFAULT 0.00,
    estado ENUM('Pendiente', 'En camino', 'Completado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (local_id) REFERENCES locales(id) ON DELETE RESTRICT,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    FOREIGN KEY (motociclista_id) REFERENCES motociclistas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 6. Tabla: promociones
-- ============================================================================
CREATE TABLE promociones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    local_id INT NOT NULL,
    producto_id INT NOT NULL,
    porcentaje_descuento INT NOT NULL CHECK (porcentaje_descuento >= 1 AND porcentaje_descuento <= 100),
    duracion_minutos INT NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (local_id) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ============================================================================
CREATE INDEX idx_productos_local ON productos(local_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_creacion);
CREATE INDEX idx_motociclistas_estado ON motociclistas(estado);
CREATE INDEX idx_promociones_expiracion ON promociones(fecha_expiracion);

-- ============================================================================
-- DATOS INICIALES DE PRUEBA (SEED DATA)
-- ============================================================================

-- 1. Usuarios (admin y user)
-- Nota: Las contraseñas están en texto plano para pruebas. En producción, usar hashes.
INSERT INTO usuarios (nombre_usuario, password_hash, rol) VALUES
('admin', 'admin123', 'admin'),
('user', 'user123', 'user');

-- 2. Locales (Panchita y Polloscoco)
INSERT INTO locales (nombre, direccion, coord_x, coord_y) VALUES
('Panchita', 'Av. Principal 123, Centro', 25.00, 30.00),
('Polloscoco', 'Calle del Sabor 456, Norte', 75.00, 80.00);

-- 3. Productos (Asociados a los locales)
INSERT INTO productos (local_id, nombre, descripcion, precio, nuevo_precio, descuento_porcentaje) VALUES
-- Productos de Panchita (local_id = 1)
(1, 'Pancho Clásico', 'Pancho con mostaza y ketchup', 3.50, 3.50, 0),
(1, 'Pancho Especial', 'Pancho con tocino, queso y papas', 5.00, 5.00, 0),
-- Productos de Polloscoco (local_id = 2)
(2, 'Combo Familiar', '1 Pollo entero + papas + gaseosa 1.5L', 15.00, 15.00, 0),
(2, 'Alitas BBQ', 'Porción de 8 alitas con salsa BBQ', 8.00, 8.00, 0);

-- 4. Motociclistas (Manolo, Mario y Jose)
INSERT INTO motociclistas (nombre, tipo_vehiculo, placa_o_id, estado, coord_x, coord_y) VALUES
('Manolo', 'Moto', 'MOT-001', 'Libre', 10.00, 15.00),
('Mario', 'Bici', 'BIC-042', 'Libre', 50.00, 50.00),
('Jose', 'Moto', 'MOT-099', 'Libre', 85.00, 70.00);

-- 5. Promociones (Ejemplo de una promoción activa)
-- Expira en 60 minutos a partir de la creación
INSERT INTO promociones (local_id, producto_id, porcentaje_descuento, duracion_minutos, fecha_expiracion, activa) VALUES
(1, 2, 15, 60, DATE_ADD(NOW(), INTERVAL 60 MINUTE), TRUE),
(2, 3, 10, 120, DATE_ADD(NOW(), INTERVAL 120 MINUTE), TRUE);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================