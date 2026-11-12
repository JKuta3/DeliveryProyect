# Especificación Técnica Full-Stack: FastMile Analytics (Sistema de Delivery)

## 1. Rol y Objetivo
Actúa como un Arquitecto de Software Full-Stack Senior. Tu objetivo es ayudarme a migrar mi sistema **FastMile Analytics** (originalmente desarrollado en Python como aplicación de consola con archivos `.txt`) hacia una aplicación web Full-Stack completa utilizando **MySQL (Base de Datos)**, **Node.js + Express + TypeScript (Backend)** y una interfaz web moderna **(Frontend)**[cite: 15].

---

## 2. Entorno Distribuido y Stack Tecnológico (Obligatorio)
* **Arquitectura de Red del Equipo (3 Máquinas Virtuales en 3 PCs distintas):**
  * **VM 1 (Windows 11 - Mi equipo):** Desarrollo y ejecución del **Backend** y **Frontend** en VS Code. No me des comandos exclusivos de Linux/Ubuntu (`sudo`, `apt`, `curl` de Unix); usa sintaxis compatible con PowerShell/Windows o comandos universales de `npm`.
  * **VM 2 (Ubuntu - PC 2):** Servidor dedicado para la **Base de Datos (MySQL)**. Por lo tanto, la conexión desde el Backend no será necesariamente a `localhost`, sino configurable mediante variables de entorno (`DB_HOST` apuntando a la IP de la VM de Ubuntu en la red local).
  * **VM 3 (Ubuntu - PC 3):** Nodo adicional del equipo (despliegue/pruebas de integración en red).
  * **Importante para Red y CORS:** El Backend debe tener `cors()` habilitado para aceptar peticiones desde distintas IPs de la red local y escuchar en `0.0.0.0` (o puerto `3000` abierto) para comunicarse con las otras máquinas virtuales.
* **Estructura de Carpetas Existente (en mi VM Windows 11):**
  * `DeliveryProyect/`
    * `Backend/` (Ya inicializado con `package.json`, `tsconfig.json`, `.gitignore`, `.env` y `src/index.ts`)
    * `DB/` (Carpeta destinada para scripts `.sql` y documentación)
    * `Frontend/` (Carpeta para la interfaz web completa; actualmente contiene `readme.html`)
* **Stack Técnico:**
  * **Base de Datos (`DB/`):** MySQL Server corriendo en Ubuntu (conectado desde Node.js mediante `mysql2/promise`).
  * **Backend (`Backend/`):** Node.js + Express + TypeScript (ejecutado en desarrollo con `tsx watch src/index.ts`). Librerías ya instaladas: `express`, `cors`, `dotenv`, `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`.
  * **Frontend (`Frontend/`):** Interfaz web moderna (HTML5, CSS3, TypeScript/JavaScript o Angular/Vite según corresponda) que consuma los endpoints de la API REST usando una URL base configurable (`API_URL`), incluyendo **Chart.js** para reemplazar los gráficos de Matplotlib.## 3. Reglas de Arquitectura y Código

### Backend (`Backend/src/`)
1. **Respetar mi configuración actual:** Ya tengo `src/index.ts` corriendo en el puerto `3000` con `cors()`, `express.json()`, y las rutas base `GET /` y `GET /health`[cite: 13]. Construye de forma modular sobre esta base.
2. **Estructura Modular:**
   * `src/config/db.ts` -> Pool de conexiones a MySQL usando variables de entorno (`.env`).
   * `src/routes/` -> Rutas por módulo (`auth`, `locales`, `productos`, `motociclistas`, `pedidos`, `promociones`, `reportes`).
   * `src/controllers/` -> Lógica de negocio, validaciones y manejo de peticiones (`Request`, `Response`).
   * `src/interfaces/` -> Interfaces de TypeScript para tipar todas las entidades.
3. **Validaciones y Respuestas:**
   * Reemplazar la antigua librería `validar.py` por validaciones estrictas en TypeScript antes de consultar la BD (rechazar cadenas vacías, números negativos o ceros donde se exijan enteros/decimales positivos)[cite: 15].
   * Usar `async/await` con bloques `try/catch` en todos los controladores.
   * Devolver códigos HTTP semánticos (`200`, `201`, `400`, `403`, `404`, `500`) y respuestas JSON estandarizadas (`{ status: 'ok' | 'error', message: '...', data: ... }`).

### Frontend (`Frontend/`)
1. **Control de Acceso por Rol (`admin` vs `user`):**
   * Pantalla de **Login** inicial que autentique contra el backend y guarde la sesión/rol del usuario (`localStorage`).
   * Navegación y vistas dinámicas según el rol identificado[cite: 15]: ocultar paneles administrativos si el usuario es `user` y ocultar los IDs internos de los locales en la vista de catálogo para clientes[cite: 15].
2. **Experiencia de Usuario (UI/UX):**
   * Diseño tipo dashboard moderno (tema oscuro/limpio acorde a *FastMile Analytics*), formularios con validación en tiempo real en el navegador, alertas visuales claras para errores o confirmaciones, y actualización dinámica sin recargar la página.

---

## 4. Requerimientos Funcionales Full-Stack (Backend + Frontend)

### A. Autenticación y Roles (`usuarios`)
* **Backend:** `POST /api/auth/login` valida usuario y contraseña y devuelve el rol (`admin` o `user`)[cite: 15].
* **Frontend:** Vista de inicio de sesión y cierre de sesión con redirección automática al panel correspondiente.

### B. Locales y Catálogo de Productos (`locales` y `productos`)
* **Backend:**
  * `GET /api/locales`: Lista locales y productos (muestra `id` solo si es `admin`; lo oculta si es `user`)[cite: 15].
  * `GET /api/locales/buscar`: Búsqueda por nombre o ID[cite: 15].
  * `POST /api/locales` y `POST /api/locales/:id/productos` (Solo `admin`): Alta de locales y adición de productos al catálogo[cite: 15].
  * `PATCH /api/productos/:id/descuento` (Solo `admin`): Aplica porcentaje de rebaja (`1` a `99`) y actualiza el precio (`nuevo_precio = precio * (1 - porcentaje / 100)`)[cite: 15].
* **Frontend:**
  * Catálogo visual en tarjetas para explorar locales y productos con buscador en vivo.
  * Formularios modales o secciones exclusivas para `admin` para registrar locales, agregar productos y aplicar descuentos con vista previa del nuevo precio.

### C. Promociones Temporales (`promociones`)
* **Backend:** `POST /api/promociones` (Solo `admin`) registra `local_id`, `producto_id`, `porcentaje_descuento` (`1` a `100`) y `duracion_minutos`, calculando `fecha_expiracion = NOW() + duracion_minutos`[cite: 15]. `GET /api/promociones` devuelve las promociones vigentes.
* **Frontend:** Banner o sección de ofertas activas con temporizador/hora de expiración y formulario de creación para el administrador[cite: 15].

### D. Motociclistas y Despacho Geográfico (`motociclistas`)
* **Backend:**
  * `POST /api/motociclistas` (Solo `admin`): Registra `nombre`, `tipo_vehiculo` (`Moto` o `Bici`), `placa_o_id`, estado inicial `'Libre'` y coordenadas cartesianas `(coord_x, coord_y)` en escala `0` a `100`[cite: 15].
  * `POST /api/pedidos/:id/despachar`: Filtra unidades `'Libre'`, recibe coordenadas `(x, y)` del consumidor, calcula la **distancia euclidiana**:
    $$\text{distancia} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
    asigna la unidad más cercana cambiándola a `'Ocupado'`, y al finalizar la entrega actualiza el pedido a `'Completado'`, mueve las coordenadas del repartidor a la ubicación del cliente y lo devuelve a `'Libre'`[cite: 15].
* **Frontend:**
  * Tabla/mapa visual de cuadrante cartesiano (`0–100`) mostrando la posición y estado (`Libre` / `Ocupado`) de los repartidores[cite: 15].
  * Interfaz de despacho donde se ingresan las coordenadas del cliente, muestra la unidad óptima localizada y simula/confirma el progreso de entrega hasta marcarla como `Completado`[cite: 15].

### E. Pedidos y Cotizador de Tarifas (`pedidos`)
* **Backend:**
  * `POST /api/pedidos/calcular-tarifa`: Calcula `total_envio = 2.50 + (distancia_km * 1.25)` y devuelve el desglose[cite: 15].
  * `POST /api/pedidos` y `GET /api/pedidos`: Crea pedidos con estado inicial `'Pendiente'` y permite listar órdenes[cite: 15].
* **Frontend:**
  * Cotizador interactivo de tarifas de envío en tiempo real (tarifa base `$2.50` + `$1.25/km`)[cite: 15].
  * Formulario de creación de pedido seleccionando local, producto y cantidad, más listado de órdenes con etiquetas de estado (`Pendiente` / `Completado`)[cite: 15].

### F. Dashboard Analítico (`GET /api/reportes/dashboard` - Solo `admin`)
* **Backend:** Devuelve conteos de pedidos (`Pendiente` vs `Completado`), disponibilidad de repartidores (`Libre` vs `Ocupado`) y tendencia de demanda por bloques horarios (`12:00`, `14:00`, `16:00`, `18:00`, `20:00`, `22:00`)[cite: 15].
* **Frontend:** Panel de analítica visual con **Chart.js** replicando los 3 gráficos del proyecto original[cite: 15]:
  1. **Gráfico de barras:** Métricas globales de pedidos (Pendientes vs Completados)[cite: 15].
  2. **Gráfico circular (donut):** Disponibilidad de repartidores (Libres vs Ocupados)[cite: 15].
  3. **Gráfico de líneas:** Tendencia de demanda horaria[cite: 15].

---

## 5. Entregables Esperados (Paso a Paso)
No generes todo el código de golpe en un solo mensaje gigante. Trabajaremos de forma iterativa en este orden:

* **Paso 1 (Base de Datos):** Genera el script SQL completo (`DB/fastmile_db.sql`) para MySQL con todas las tablas normalizadas (`usuarios`, `locales`, `productos`, `motociclistas`, `pedidos`, `promociones`), llaves primarias/foráneas e inserción de datos iniciales de prueba (locales *Panchita* y *Polloscoco*, repartidores *Manolo*, *Mario* y *Jose*, y usuarios `admin` y `user`)[cite: 15].
* **Paso 2 (Conexión Backend):** Muéstrame los comandos `npm` para instalar `mysql2`, el contenido de `.env` y el código de `src/config/db.ts`.
* **Paso 3 (Módulos API REST):** Implementaremos uno por uno los controladores y rutas conectándolos a `src/index.ts`.
* **Paso 4 (Frontend Completo):** Construiremos la estructura dentro de `Frontend/` (vistas de Login, Catálogo, Pedidos/Cotizador, Despacho de Motociclistas, Promociones/Descuentos y Dashboard con gráficos Chart.js) conectada totalmente a la API.

**Instrucción inicial:** Confirma que comprendiste toda la arquitectura Full-Stack de **FastMile Analytics** y comienza entregándome únicamente el **Paso 1 (Script SQL completo para MySQL)** listo para ejecutar en mi carpeta `DB/`.13:41 12/11/2026