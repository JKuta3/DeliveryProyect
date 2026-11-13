// Backend/src/controllers/reportesController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// GET /api/reportes/dashboard
export const getDashboard = async (req: Request, res: Response) => {
    try {
        // 1. Conteo de pedidos por estado
        const [pedidosStats]: any = await pool.query(
            "SELECT estado, COUNT(*) as total FROM pedidos GROUP BY estado"
        );

        // 2. Conteo de motociclistas por estado
        const [motosStats]: any = await pool.query(
            "SELECT estado, COUNT(*) as total FROM motociclistas GROUP BY estado"
        );

        // 3. Tendencia horaria (simulada por bloques para el gráfico de líneas)
        // En un caso real, agruparías por HOUR(fecha_creacion). Aquí devolvemos estructura base.
        const [tendenciaHoraria]: any = await pool.query(
            `SELECT 
                CASE 
                    WHEN HOUR(fecha_creacion) BETWEEN 0 AND 5 THEN '00:00'
                    WHEN HOUR(fecha_creacion) BETWEEN 6 AND 11 THEN '06:00'
                    WHEN HOUR(fecha_creacion) BETWEEN 12 AND 17 THEN '12:00'
                    WHEN HOUR(fecha_creacion) BETWEEN 18 AND 23 THEN '18:00'
                END as bloque_horario,
                COUNT(*) as total
            FROM pedidos 
            GROUP BY bloque_horario 
            ORDER BY bloque_horario`
        );

        res.status(200).json({
            status: 'ok',
            data: {
                pedidos: pedidosStats,
                motociclistas: motosStats,
                tendencia_horaria: tendenciaHoraria
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener dashboard', error: (error as Error).message });
    }
};