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
                coord_x: local.coord_x,
                coord_y: local.coord_y,
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

// PUT /api/locales/:id - Actualizar local comercial (Solo admin)
export const actualizarLocal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, coord_x, coord_y } = req.body;

        if (!nombre || !direccion) {
            return res.status(400).json({ status: 'error', message: 'Nombre y dirección son obligatorios' });
        }
        if (coord_x < 0 || coord_x > 100 || coord_y < 0 || coord_y > 100) {
            return res.status(400).json({ status: 'error', message: 'Las coordenadas deben estar entre 0 y 100' });
        }

        const [existing]: any = await pool.query('SELECT * FROM locales WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Local no encontrado' });
        }

        await pool.query(
            'UPDATE locales SET nombre = ?, direccion = ?, coord_x = ?, coord_y = ? WHERE id = ?',
            [nombre.trim(), direccion.trim(), coord_x, coord_y, id]
        );

        res.status(200).json({
            status: 'ok',
            message: 'Local comercial actualizado exitosamente',
            data: { id: Number(id), nombre: nombre.trim(), direccion: direccion.trim(), coord_x, coord_y }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al actualizar local', error: (error as Error).message });
    }
};

// DELETE /api/locales/:id - Eliminar local comercial (Solo admin)
export const eliminarLocal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [existing]: any = await pool.query('SELECT * FROM locales WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Local no encontrado' });
        }

        // Verificar si tiene pedidos asociados
        const [pedidos]: any = await pool.query('SELECT COUNT(*) as total FROM pedidos WHERE local_id = ?', [id]);
        if (pedidos[0]?.total > 0) {
            return res.status(400).json({
                status: 'error',
                message: `No se puede eliminar el local porque tiene ${pedidos[0].total} pedido(s) asociados en el historial.`
            });
        }

        // Eliminar productos asociados y luego el local
        await pool.query('DELETE FROM productos WHERE local_id = ?', [id]);
        await pool.query('DELETE FROM locales WHERE id = ?', [id]);

        res.status(200).json({ status: 'ok', message: 'Local eliminado exitosamente', data: { id: Number(id) } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al eliminar local', error: (error as Error).message });
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

// PUT /api/productos/:id - Modificar producto existente (Solo admin)
export const actualizarProducto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, descuento_porcentaje, local_id } = req.body;

        if (!nombre || precio === undefined || Number(precio) <= 0) {
            return res.status(400).json({ status: 'error', message: 'Nombre y precio positivo son obligatorios' });
        }

        const [existing]: any = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
        }

        const descuento = (descuento_porcentaje !== undefined && Number(descuento_porcentaje) >= 0 && Number(descuento_porcentaje) <= 99)
            ? Number(descuento_porcentaje)
            : Number(existing[0].descuento_porcentaje || 0);

        const precioNum = Number(precio);
        const nuevoPrecio = Number((precioNum * (1 - descuento / 100)).toFixed(2));
        const targetLocalId = local_id ? Number(local_id) : existing[0].local_id;

        await pool.query(
            'UPDATE productos SET local_id = ?, nombre = ?, descripcion = ?, precio = ?, nuevo_precio = ?, descuento_porcentaje = ? WHERE id = ?',
            [targetLocalId, nombre.trim(), descripcion || '', precioNum, nuevoPrecio, descuento, id]
        );

        res.status(200).json({
            status: 'ok',
            message: 'Producto actualizado exitosamente',
            data: {
                id: Number(id),
                local_id: targetLocalId,
                nombre: nombre.trim(),
                descripcion: descripcion || '',
                precio: precioNum,
                nuevo_precio: nuevoPrecio,
                descuento_porcentaje: descuento
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al actualizar producto', error: (error as Error).message });
    }
};

// DELETE /api/productos/:id - Eliminar producto del catálogo (Solo admin)
export const eliminarProducto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [existing]: any = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
        }

        // Verificar si tiene pedidos asociados
        const [pedidos]: any = await pool.query('SELECT COUNT(*) as total FROM pedidos WHERE producto_id = ?', [id]);
        if (pedidos[0]?.total > 0) {
            return res.status(400).json({
                status: 'error',
                message: `No se puede eliminar el producto porque tiene ${pedidos[0].total} pedido(s) asociados en el historial.`
            });
        }

        await pool.query('DELETE FROM productos WHERE id = ?', [id]);

        res.status(200).json({ status: 'ok', message: 'Producto eliminado exitosamente', data: { id: Number(id) } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al eliminar producto', error: (error as Error).message });
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