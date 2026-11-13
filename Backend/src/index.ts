// Backend/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db';

// Importar rutas
import authRoutes from './routes/authRoutes';
import localesRoutes from './routes/localesRoutes';
import motociclistasRoutes from './routes/motociclistasRoutes';
import pedidosRoutes from './routes/pedidosRoutes';
import promocionesRoutes from './routes/promocionesRoutes';
import reportesRoutes from './routes/reportesRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas base
app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Bienvenido a FastMile Analytics API', version: '1.0.0' });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Rutas de módulos API
app.use('/api/auth', authRoutes);
app.use('/api/locales', localesRoutes);
app.use('/api/motociclistas', motociclistasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/reportes', reportesRoutes);

// Iniciar servidor
async function startServer() {
    await testConnection();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 [Server] FastMile Analytics corriendo en:`);
        console.log(`   🌐 Local:   http://localhost:${PORT}`);
        console.log(`   🌍 Red:     http://0.0.0.0:${PORT}\n`);
    });
}

startServer();

export default app;