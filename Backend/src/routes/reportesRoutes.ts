// Backend/src/routes/reportesRoutes.ts
import { Router } from 'express';
import { getDashboard } from '../controllers/reportesController';

const router = Router();

router.get('/dashboard', getDashboard);

export default router;