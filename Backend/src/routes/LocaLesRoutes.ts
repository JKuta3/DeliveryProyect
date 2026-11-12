// Backend/src/routes/localesRoutes.ts
import { Router } from 'express';
import { 
    getLocales, 
    buscarLocales, 
    crearLocal, 
    agregarProducto, 
    aplicarDescuento 
} from '../controllers/localesController';

const router = Router();

router.get('/', getLocales);
router.get('/buscar', buscarLocales);
router.post('/', crearLocal);
router.post('/:id/productos', agregarProducto);
router.patch('/productos/:id/descuento', aplicarDescuento);

export default router;