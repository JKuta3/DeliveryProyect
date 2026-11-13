// Backend/src/controllers/promocionesController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// POST /api/promociones - Crear promoción (Admin)
export const crearPromocion = async (req: Request, res: Response) => {
    try {
        const { local_id, producto_id, porcentaje_descuento, duracion_minutos } = req.body;

        if (!local_id || !producto_id || !porcentaje_descuento || !duracion_minutos) {
            return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
        }
        if (porcentaje_descuento < 1 || porcentaje_descuento > 100) {
            return res.status(400).json({ status: 'error', message: 'Descuento debe ser entre 1 y 100' });
        }

        // Calcular fecha_expiracion
        const fechaExpiracion = new Date();
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + duracion_minutos);
        const fechaExpiracionSQL = fechaExpiracion.toISOString().slice(0, 19).replace('T', ' ');

        const [result]: any = await pool.query(
            'INSERT INTO promociones (local_id, producto_id, porcentaje_descuento, duracion_minutos, fecha_expiracion, activa) VALUES (?, ?, ?, ?, ?, TRUE)',
            [local_id, producto_id, porcentaje_descuento, duracion_minutos, fechaExpiracionSQL]
        );

        res.status(201).json({ 
            status: 'ok', 
            message: 'Promoción creada', 
            data: { id: result.insertId, expira_en: fechaExpiracionSQL } 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al crear promoción', error: (error as Error).message });
    }
};

// GET /api/promociones - Listar vigentes
export const getPromocionesVigentes = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(
            'SELECT p.*, l.nombre as local_nombre, pr.nombre as producto_nombre FROM promociones p JOIN locales l ON p.local_id = l.id JOIN productos pr ON p.producto_id = pr.id WHERE p.activa = TRUE AND p.fecha_expiracion > NOW() ORDER BY p.fecha_expiracion ASC'
        );
        res.status(200).json({ status: 'ok', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener promociones', error: (error as Error).message });
    }
};