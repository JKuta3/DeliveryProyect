// Backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

export const login = async (req: Request, res: Response) => {
    try {
        const { nombre_usuario, password } = req.body;

        // Validaciones estrictas
        if (!nombre_usuario || typeof nombre_usuario !== 'string' || nombre_usuario.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'El nombre de usuario es obligatorio' });
        }
        if (!password || typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'La contraseña es obligatoria' });
        }

        const [rows]: any = await pool.query(
            'SELECT id, nombre_usuario, rol FROM usuarios WHERE nombre_usuario = ? AND password_hash = ?',
            [nombre_usuario.trim(), password.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Credenciales incorrectas' });
        }

        const usuario = rows[0];
        res.status(200).json({
            status: 'ok',
            message: 'Login exitoso',
            data: {
                id: usuario.id,
                nombre_usuario: usuario.nombre_usuario,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor', error: (error as Error).message });
    }
};