// Backend/src/routes/motociclistasRoutes.ts
import { Router } from 'express';
import { getMotociclistas, crearMotociclista, actualizarUbicacion } from '../controllers/motociclistasController';

const router = Router();

router.get('/', getMotociclistas);
router.post('/', crearMotociclista);
router.patch('/:id/ubicacion', actualizarUbicacion);

export default router;