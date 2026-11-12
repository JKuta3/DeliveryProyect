// Backend/src/config/db.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones reutilizable
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fastmile_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// Función para probar la conexión al iniciar el servidor
export async function testConnection(): Promise<void> {
    try {
        const connection = await pool.getConnection();
        console.log('✅ [DB] Conexión exitosa a MySQL');
        console.log(`   📦 Base de datos: ${process.env.DB_NAME}`);
        console.log(`   🌐 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        connection.release();
    } catch (error) {
        console.error('❌ [DB] Error al conectar con MySQL:', error);
        console.error('   💡 Verifica que XAMPP/MySQL esté corriendo y que las credenciales en .env sean correctas.');
        process.exit(1);
    }
}

export default pool;