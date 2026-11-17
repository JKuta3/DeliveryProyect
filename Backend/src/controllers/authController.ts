// Backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// POST /api/auth/login - Autenticación
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

// POST /api/auth/register - Registro de nuevo usuario (Seguro: por defecto 'user')
export const register = async (req: Request, res: Response) => {
    try {
        const { nombre_usuario, password, rol, is_admin_creation } = req.body;

        // Validaciones estrictas
        if (!nombre_usuario || typeof nombre_usuario !== 'string' || nombre_usuario.trim().length < 3) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'El nombre de usuario es obligatorio y debe tener al menos 3 caracteres' 
            });
        }
        if (!password || typeof password !== 'string' || password.trim().length < 4) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'La contraseña es obligatoria y debe tener al menos 4 caracteres' 
            });
        }

        // Seguridad: Un usuario común que se registra en la web pública SIEMPRE es rol 'user'
        // Solo si la creación viene explícita desde el panel administrativo se permite 'admin'
        const rolAsignado = (is_admin_creation === true && rol === 'admin') ? 'admin' : 'user';

        // Verificar si el usuario ya existe
        const [existente]: any = await pool.query(
            'SELECT id FROM usuarios WHERE nombre_usuario = ?',
            [nombre_usuario.trim()]
        );

        if (existente.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: `El usuario "${nombre_usuario.trim()}" ya existe en el sistema` 
            });
        }

        // Insertar usuario
        const [result]: any = await pool.query(
            'INSERT INTO usuarios (nombre_usuario, password_hash, rol) VALUES (?, ?, ?)',
            [nombre_usuario.trim(), password.trim(), rolAsignado]
        );

        res.status(201).json({
            status: 'ok',
            message: 'Usuario registrado exitosamente',
            data: {
                id: result.insertId,
                nombre_usuario: nombre_usuario.trim(),
                rol: rolAsignado
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ status: 'error', message: 'Error al registrar usuario', error: (error as Error).message });
    }
};

// GET /api/auth/usuarios - Listar usuarios (para gestión y auditoría)
export const getUsuarios = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(
            'SELECT id, nombre_usuario, rol, fecha_creacion FROM usuarios ORDER BY id DESC'
        );
        res.status(200).json({ status: 'ok', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al listar usuarios', error: (error as Error).message });
    }
};
