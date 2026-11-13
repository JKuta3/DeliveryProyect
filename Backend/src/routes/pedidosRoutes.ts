// Backend/src/routes/pedidosRoutes.ts
import { Router } from 'express';
import { 
    calcularTarifa, 
    crearPedido, 
    getPedidos, 
    despacharPedido, 
    completarPedido 
} from '../controllers/pedidosController';

const router = Router();

router.post('/calcular-tarifa', calcularTarifa);
router.post('/', crearPedido);
router.get('/', getPedidos);
router.post('/:id/despachar', despacharPedido);
router.patch('/:id/completar', completarPedido);

export default router;