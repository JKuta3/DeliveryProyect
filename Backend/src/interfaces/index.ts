// Backend/src/interfaces/index.ts

export type UserRole = 'admin' | 'user';
export type VehiculoTipo = 'Moto' | 'Bici';
export type MotociclistaEstado = 'Libre' | 'Ocupado';
export type PedidoEstado = 'Pendiente' | 'En camino' | 'Completado' | 'Cancelado';

export interface Usuario {
    id: number;
    nombre_usuario: string;
    password_hash: string;
    rol: UserRole;
    fecha_creacion?: Date;
}

export interface Local {
    id?: number;
    nombre: string;
    direccion: string;
    coord_x: number;
    coord_y: number;
    fecha_creacion?: Date;
    productos?: Producto[];
}

export interface Producto {
    id?: number;
    local_id: number;
    nombre: string;
    descripcion?: string;
    precio: number;
    nuevo_precio: number;
    descuento_porcentaje?: number;
    fecha_creacion?: Date;
}

export interface Motociclista {
    id: number;
    nombre: string;
    tipo_vehiculo: VehiculoTipo;
    placa_o_id: string;
    estado: MotociclistaEstado;
    coord_x: number;
    coord_y: number;
    fecha_registro?: Date;
}

export interface Pedido {
    id?: number;
    local_id: number;
    producto_id: number;
    motociclista_id?: number | null;
    cliente_x: number;
    cliente_y: number;
    distancia_km?: number;
    total_envio?: number;
    estado: PedidoEstado;
    fecha_creacion?: Date;
    fecha_actualizacion?: Date;
}

export interface Promocion {
    id?: number;
    local_id: number;
    producto_id: number;
    porcentaje_descuento: number;
    duracion_minutos: number;
    fecha_inicio?: Date;
    fecha_expiracion: string | Date;
    activa?: boolean;
    local_nombre?: string;
    producto_nombre?: string;
}

export interface ApiResponse<T = any> {
    status: 'ok' | 'error';
    message?: string;
    data?: T;
    error?: string;
}

export interface DashboardReportes {
    pedidos: Array<{ estado: PedidoEstado; total: number }>;
    motociclistas: Array<{ estado: MotociclistaEstado; total: number }>;
    tendencia_horaria: Array<{ bloque_horario: string; total: number }>;
}
