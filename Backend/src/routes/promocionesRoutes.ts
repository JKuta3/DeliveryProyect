// Backend/src/routes/promocionesRoutes.ts
import { Router } from 'express';
import { crearPromocion, getPromocionesVigentes } from '../controllers/promocionesController';

const router = Router();

router.post('/', crearPromocion);
router.get('/', getPromocionesVigentes);

export default router;  