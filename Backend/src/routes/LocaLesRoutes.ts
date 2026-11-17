// Backend/src/routes/localesRoutes.ts
import { Router } from 'express';
import { 
    getLocales, 
    buscarLocales, 
    crearLocal, 
    actualizarLocal,
    eliminarLocal,
    agregarProducto, 
    actualizarProducto,
    eliminarProducto,
    aplicarDescuento 
} from '../controllers/localesController';

const router = Router();

router.get('/', getLocales);
router.get('/buscar', buscarLocales);
router.post('/', crearLocal);
router.put('/:id', actualizarLocal);
router.delete('/:id', eliminarLocal);

router.post('/:id/productos', agregarProducto);
router.put('/productos/:id', actualizarProducto);
router.delete('/productos/:id', eliminarProducto);
router.patch('/productos/:id/descuento', aplicarDescuento);

export default router;