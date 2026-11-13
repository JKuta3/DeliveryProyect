// Backend/src/controllers/motociclistasController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// GET /api/motociclistas - Listar todos
export const getMotociclistas = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query('SELECT * FROM motociclistas ORDER BY id');
        res.status(200).json({ status: 'ok', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener motociclistas', error: (error as Error).message });
    }
};

// POST /api/motociclistas - Registrar (Admin)
export const crearMotociclista = async (req: Request, res: Response) => {
    try {
        const { nombre, tipo_vehiculo, placa_o_id, coord_x, coord_y } = req.body;

        if (!nombre || !placa_o_id || !coord_x || !coord_y) {
            return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
        }
        if (tipo_vehiculo !== 'Moto' && tipo_vehiculo !== 'Bici') {
            return res.status(400).json({ status: 'error', message: 'tipo_vehiculo debe ser Moto o Bici' });
        }
        if (coord_x < 0 || coord_x > 100 || coord_y < 0 || coord_y > 100) {
            return res.status(400).json({ status: 'error', message: 'Coordenadas fuera de rango (0-100)' });
        }

        const [result]: any = await pool.query(
            'INSERT INTO motociclistas (nombre, tipo_vehiculo, placa_o_id, estado, coord_x, coord_y) VALUES (?, ?, ?, "Libre", ?, ?)',
            [nombre, tipo_vehiculo, placa_o_id, coord_x, coord_y]
        );

        res.status(201).json({ status: 'ok', message: 'Motociclista registrado', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al registrar motociclista', error: (error as Error).message });
    }
};

// PATCH /api/motociclistas/:id/ubicacion - Actualizar ubicación (usado al completar entrega)
export const actualizarUbicacion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { coord_x, coord_y } = req.body;

        if (coord_x < 0 || coord_x > 100 || coord_y < 0 || coord_y > 100) {
            return res.status(400).json({ status: 'error', message: 'Coordenadas fuera de rango' });
        }

        await pool.query(
            'UPDATE motociclistas SET coord_x = ?, coord_y = ?, estado = "Libre" WHERE id = ?',
            [coord_x, coord_y, id]
        );

        res.status(200).json({ status: 'ok', message: 'Ubicación actualizada y estado Libre' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al actualizar ubicación', error: (error as Error).message });
    }
};