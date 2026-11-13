// Backend/src/controllers/pedidosController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// POST /api/pedidos/calcular-tarifa
export const calcularTarifa = async (req: Request, res: Response) => {
    try {
        const { distancia_km } = req.body;
        if (!distancia_km || distancia_km <= 0) {
            return res.status(400).json({ status: 'error', message: 'distancia_km debe ser mayor a 0' });
        }

        const total_envio = 2.50 + (distancia_km * 1.25);
        res.status(200).json({
            status: 'ok',
            data: {
                distancia_km,
                tarifa_base: 2.50,
                costo_por_km: 1.25,
                total_envio: parseFloat(total_envio.toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al calcular tarifa', error: (error as Error).message });
    }
};

// POST /api/pedidos - Crear pedido
export const crearPedido = async (req: Request, res: Response) => {
    try {
        const { local_id, producto_id, cliente_x, cliente_y } = req.body;

        if (!local_id || !producto_id || !cliente_x || !cliente_y) {
            return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
        }

        const [result]: any = await pool.query(
            'INSERT INTO pedidos (local_id, producto_id, cliente_x, cliente_y, estado) VALUES (?, ?, ?, ?, "Pendiente")',
            [local_id, producto_id, cliente_x, cliente_y]
        );

        res.status(201).json({ status: 'ok', message: 'Pedido creado', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al crear pedido', error: (error as Error).message });
    }
};

// GET /api/pedidos - Listar pedidos
export const getPedidos = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query('SELECT * FROM pedidos ORDER BY fecha_creacion DESC');
        res.status(200).json({ status: 'ok', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener pedidos', error: (error as Error).message });
    }
};

// POST /api/pedidos/:id/despachar - Lógica compleja de asignación
export const despacharPedido = async (req: Request, res: Response) => {
    try {
        const { id: pedidoId } = req.params;

        // 1. Obtener datos del pedido
        const [pedidoRows]: any = await pool.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
        if (pedidoRows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
        }
        const pedido = pedidoRows[0];
        if (pedido.estado !== 'Pendiente') {
            return res.status(400).json({ status: 'error', message: 'El pedido no está en estado Pendiente' });
        }

        // 2. Obtener motociclistas libres
        const [motosLibres]: any = await pool.query("SELECT * FROM motociclistas WHERE estado = 'Libre'");
        if (motosLibres.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No hay motociclistas disponibles' });
        }

        // 3. Calcular distancia euclidiana y encontrar el más cercano
        let motociclistaCercano = null;
        let menorDistancia = Infinity;

        for (const moto of motosLibres) {
            const distancia = Math.sqrt(
                Math.pow(pedido.cliente_x - moto.coord_x, 2) + Math.pow(pedido.cliente_y - moto.coord_y, 2)
            );
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                motociclistaCercano = moto;
            }
        }

        // 4. Actualizar pedido y motociclista en transacción
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Actualizar pedido
            await connection.query(
                'UPDATE pedidos SET estado = "En camino", motociclista_id = ?, distancia_km = ? WHERE id = ?',
                [motociclistaCercano.id, menorDistancia, pedidoId]
            );

            // Cambiar estado del motociclista a Ocupado
            await connection.query(
                'UPDATE motociclistas SET estado = "Ocupado" WHERE id = ?',
                [motociclistaCercano.id]
            );

            await connection.commit();
            
            res.status(200).json({
                status: 'ok',
                message: 'Pedido despachado',
                data: {
                    pedido_id: pedidoId,
                    motociclista_asignado: motociclistaCercano.nombre,
                    distancia_euclidiana: parseFloat(menorDistancia.toFixed(2))
                }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al despachar pedido', error: (error as Error).message });
    }
};

// PATCH /api/pedidos/:id/completar - Finalizar entrega
export const completarPedido = async (req: Request, res: Response) => {
    try {
        const { id: pedidoId } = req.params;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Obtener pedido para saber coordenadas del cliente y motociclista
            const [pedidoRows]: any = await connection.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
            if (pedidoRows.length === 0) return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
            
            const pedido = pedidoRows[0];
            if (!pedido.motociclista_id) return res.status(400).json({ status: 'error', message: 'El pedido no tiene motociclista asignado' });

            // 2. Actualizar pedido a Completado
            await connection.query('UPDATE pedidos SET estado = "Completado" WHERE id = ?', [pedidoId]);

            // 3. Mover motociclista a ubicación del cliente y ponerlo Libre
            await connection.query(
                'UPDATE motociclistas SET coord_x = ?, coord_y = ?, estado = "Libre" WHERE id = ?',
                [pedido.cliente_x, pedido.cliente_y, pedido.motociclista_id]
            );

            await connection.commit();
            res.status(200).json({ status: 'ok', message: 'Entrega completada' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al completar pedido', error: (error as Error).message });
    }
};