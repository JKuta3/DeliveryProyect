// Backend/src/controllers/localesController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// GET /api/locales - Lista locales y productos (oculta ID si es user)
export const getLocales = async (req: Request, res: Response) => {
    try {
        const rol = req.query.rol as string; // Se pasa ?rol=admin o ?rol=user desde el frontend
        const mostrarId = rol === 'admin';

        const [locales]: any = await pool.query('SELECT * FROM locales');
        
        const localesConProductos = await Promise.all(locales.map(async (local: any) => {
            const [productos]: any = await pool.query('SELECT * FROM productos WHERE local_id = ?', [local.id]);
            
            // Mapear productos para ocultar/mostrar ID según el rol
            const productosFormateados = productos.map((p: any) => ({
                ...(mostrarId ? { id: p.id } : {}),
                nombre: p.nombre,
                descripcion: p.descripcion,
                precio: p.precio,
                nuevo_precio: p.nuevo_precio,
                descuento_porcentaje: p.descuento_porcentaje
            }));

            return {
                ...(mostrarId ? { id: local.id } : {}),
                nombre: local.nombre,
                direccion: local.direccion,
                productos: productosFormateados
            };
        }));

        res.status(200).json({ status: 'ok', data: localesConProductos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener locales', error: (error as Error).message });
    }
};

// GET /api/locales/buscar - Búsqueda por nombre o ID
export const buscarLocales = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ status: 'error', message: 'El parámetro de búsqueda "q" es obligatorio' });
        }

        const [rows]: any = await pool.query(
            'SELECT * FROM locales WHERE nombre LIKE ? OR id = ?',
            [`%${q}%`, isNaN(Number(q)) ? null : Number(q)]
        );

        res.status(200).json({ status: 'ok', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error en la búsqueda', error: (error as Error).message });
    }
};

// POST /api/locales - Alta de local (Solo admin)
export const crearLocal = async (req: Request, res: Response) => {
    try {
        const { nombre, direccion, coord_x, coord_y } = req.body;

        if (!nombre || !direccion) {
            return res.status(400).json({ status: 'error', message: 'Nombre y dirección son obligatorios' });
        }
        if (coord_x < 0 || coord_x > 100 || coord_y < 0 || coord_y > 100) {
            return res.status(400).json({ status: 'error', message: 'Las coordenadas deben estar entre 0 y 100' });
        }

        const [result]: any = await pool.query(
            'INSERT INTO locales (nombre, direccion, coord_x, coord_y) VALUES (?, ?, ?, ?)',
            [nombre, direccion, coord_x, coord_y]
        );

        res.status(201).json({ status: 'ok', message: 'Local creado exitosamente', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al crear local', error: (error as Error).message });
    }
};

// POST /api/locales/:id/productos - Agregar producto (Solo admin)
export const agregarProducto = async (req: Request, res: Response) => {
    try {
        const { id: localId } = req.params;
        const { nombre, descripcion, precio } = req.body;

        if (!nombre || !precio || precio <= 0) {
            return res.status(400).json({ status: 'error', message: 'Nombre y precio positivo son obligatorios' });
        }

        const [result]: any = await pool.query(
            'INSERT INTO productos (local_id, nombre, descripcion, precio, nuevo_precio) VALUES (?, ?, ?, ?, ?)',
            [localId, nombre, descripcion || '', precio, precio] // nuevo_precio inicial = precio
        );

        res.status(201).json({ status: 'ok', message: 'Producto agregado', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al agregar producto', error: (error as Error).message });
    }
};

// PATCH /api/productos/:id/descuento - Aplicar descuento (Solo admin)
export const aplicarDescuento = async (req: Request, res: Response) => {
    try {
        const { id: productoId } = req.params;
        const { porcentaje } = req.body;

        if (!porcentaje || porcentaje < 1 || porcentaje > 99) {
            return res.status(400).json({ status: 'error', message: 'El descuento debe ser entre 1 y 99' });
        }

        const [producto]: any = await pool.query('SELECT precio FROM productos WHERE id = ?', [productoId]);
        if (producto.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
        }

        const precioOriginal = producto[0].precio;
        const nuevoPrecio = precioOriginal * (1 - porcentaje / 100);

        await pool.query(
            'UPDATE productos SET descuento_porcentaje = ?, nuevo_precio = ? WHERE id = ?',
            [porcentaje, nuevoPrecio, productoId]
        );

        res.status(200).json({
            status: 'ok',
            message: 'Descuento aplicado',
            data: { precio_original: precioOriginal, nuevo_precio: nuevoPrecio, descuento: porcentaje }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al aplicar descuento', error: (error as Error).message });
    }
};