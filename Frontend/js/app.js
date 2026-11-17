// ============================================================================
// FastMile Analytics - Sistema de Delivery & Logística
// Interfaz Moderna: Azul, Amarillo y Blanco | Cards Profesionales & Responsive
// Control Estricto de Roles (Admin vs User), Menú Estable & Auditoría
// ============================================================================

// --- Configuración Global de la API ---
let API_URL = localStorage.getItem('fastmile_api_url') || 'http://localhost:3000/api';
let currentUser = null;
let charts = {};
let cachedLocales = [];
let cachedMotociclistas = [];
let cachedPedidos = [];
let cachedUsuarios = [];

// --- Inicialización al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
    initActivityLog();
    updateApiStatusDots();
    setupMobileSidebar();

    const storedUser = localStorage.getItem('fastmile_usuario');
    const storedRol = localStorage.getItem('fastmile_rol');
    const storedId = localStorage.getItem('fastmile_id');

    if (storedUser && storedRol) {
        currentUser = { id: storedId ? Number(storedId) : 1, nombre: storedUser, rol: storedRol };
        showApp();
    } else {
        showLogin();
    }
});

// ============================================================================
// GESTIÓN ROBUSTA DE CHART.JS (Evita que el Dashboard y el Menú se rompan)
// ============================================================================
function destroyAllCharts() {
    if (typeof Chart === 'undefined') return;

    ['chartPedidos', 'chartMotos', 'chartTendencia'].forEach(id => {
        try {
            const chartInstance = Chart.getChart(id);
            if (chartInstance) {
                chartInstance.stop();
                chartInstance.destroy();
            }
        } catch (e) {
            console.warn('Error limpiando canvas:', id, e);
        }
    });

    for (const key in charts) {
        if (charts[key]) {
            try {
                charts[key].stop();
                charts[key].destroy();
            } catch (e) {}
        }
    }
    charts = {};
}

// ============================================================================
// SISTEMA DE NOTIFICACIONES TOAST
// ============================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================================
// VER / OCULTAR CONTRASEÑA (TOGGLE EYE 👁️)
// ============================================================================
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<span class="eye-icon">🙈</span>';
        btn.title = 'Ocultar contraseña';
    } else {
        input.type = 'password';
        btn.innerHTML = '<span class="eye-icon">👁️</span>';
        btn.title = 'Ver contraseña';
    }
};

// ============================================================================
// CONFIGURACIÓN DISCRETA DE CONEXIÓN
// ============================================================================
function updateApiStatusDots(isOnline = true) {
    const dots = [
        document.getElementById('login-status-dot'),
        document.getElementById('header-status-dot')
    ];
    dots.forEach(dot => {
        if (dot) dot.className = isOnline ? 'status-dot online' : 'status-dot offline';
    });
}

window.openApiConfigModal = function() {
    const input = document.getElementById('cfg-api-url');
    if (input) input.value = API_URL;
    openModal('modal-api-config');
};

window.saveApiUrlConfig = function() {
    const input = document.getElementById('cfg-api-url');
    if (input && input.value.trim() !== '') {
        API_URL = input.value.trim().replace(/\/+$/, '');
        localStorage.setItem('fastmile_api_url', API_URL);
        closeModal('modal-api-config');
        showToast('Servidor configurado correctamente', 'success');
        checkApiHealth();
    }
};

async function checkApiHealth() {
    try {
        const rootUrl = API_URL.replace('/api', '');
        const res = await fetch(`${rootUrl}/health`, { signal: AbortSignal.timeout(2000) });
        updateApiStatusDots(res.ok);
    } catch (e) {
        updateApiStatusDots(false);
    }
}

// ============================================================================
// TABS DE LOGIN / REGISTRO
// ============================================================================
window.switchAuthTab = function(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    } else {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
    }
};

// ============================================================================
// AUTENTICACIÓN & SESIÓN
// ============================================================================
window.setQuickLogin = function(user, pass) {
    document.getElementById('username').value = user;
    document.getElementById('password').value = pass;
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-login');
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');
    
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Verificando...</span>';

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: user, password: pass })
        });
        const data = await res.json();

        if (res.ok && data.status === 'ok') {
            currentUser = {
                id: data.data.id,
                nombre: data.data.nombre_usuario,
                rol: data.data.rol
            };
            localStorage.setItem('fastmile_usuario', currentUser.nombre);
            localStorage.setItem('fastmile_rol', currentUser.rol);
            localStorage.setItem('fastmile_id', currentUser.id);

            logActivity('usuario', 'Inicio de Sesión', `El usuario ${currentUser.nombre} (${currentUser.rol}) ingresó al sistema.`);
            showToast(`¡Bienvenido, ${currentUser.nombre}!`, 'success');
            showApp();
        } else {
            errorEl.textContent = data.message || 'Credenciales incorrectas.';
            errorEl.classList.remove('hidden');
            showToast(data.message || 'Error en las credenciales', 'error');
        }
    } catch (err) {
        // Fallback demo para pruebas rápidas
        if (user === 'admin' || user === 'user') {
            currentUser = { id: user === 'admin' ? 1 : 2, nombre: user, rol: user };
            localStorage.setItem('fastmile_usuario', currentUser.nombre);
            localStorage.setItem('fastmile_rol', currentUser.rol);
            localStorage.setItem('fastmile_id', currentUser.id);
            logActivity('usuario', 'Inicio de Sesión (Offline)', `El usuario ${currentUser.nombre} ingresó.`);
            showToast(`Ingresando como ${user}`, 'info');
            showApp();
        } else {
            errorEl.textContent = 'No se pudo conectar con el servidor. Revisa que el backend esté activo.';
            errorEl.classList.remove('hidden');
            showToast('Error al conectar con la base de datos', 'error');
        }
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Iniciar Sesión</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
});

// ============================================================================
// REGISTRO DE NUEVO USUARIO (Público = Rol 'user' Estricto)
// ============================================================================
window.handleRegisterUser = async function(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-register');
    const errorEl = document.getElementById('register-error');
    errorEl.classList.add('hidden');

    const nombre = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const passConfirm = document.getElementById('reg-password-confirm').value.trim();

    if (pass !== passConfirm) {
        errorEl.textContent = 'Las contraseñas no coinciden. Por favor verifícalas.';
        errorEl.classList.remove('hidden');
        showToast('Las contraseñas no coinciden', 'warning');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Registrando cuenta...</span>';

    // REGLA DE SEGURIDAD: El registro público siempre asigna rol 'user'
    const rolSeguro = 'user';

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: nombre, password: pass, rol: rolSeguro, is_admin_creation: false })
        });
        const data = await res.json();

        if (res.ok && data.status === 'ok') {
            showToast('¡Cuenta creada con éxito! Iniciando sesión...', 'success');
            currentUser = {
                id: data.data.id,
                nombre: data.data.nombre_usuario,
                rol: 'user'
            };
            localStorage.setItem('fastmile_usuario', currentUser.nombre);
            localStorage.setItem('fastmile_rol', 'user');
            localStorage.setItem('fastmile_id', currentUser.id);

            logActivity('usuario', 'Nuevo Cliente Registrado', `Se registró la cuenta de cliente "${currentUser.nombre}".`);
            showApp();
        } else {
            errorEl.textContent = data.message || 'Error al registrar usuario.';
            errorEl.classList.remove('hidden');
            showToast(data.message || 'No se pudo crear la cuenta', 'error');
        }
    } catch (err) {
        // Modo offline
        currentUser = { id: Date.now(), nombre: nombre, rol: 'user' };
        localStorage.setItem('fastmile_usuario', currentUser.nombre);
        localStorage.setItem('fastmile_rol', 'user');
        localStorage.setItem('fastmile_id', currentUser.id);
        logActivity('usuario', 'Usuario Cliente Registrado (Local)', `Se creó la cuenta "${nombre}".`);
        showToast('Cuenta de cliente creada', 'info');
        showApp();
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>✨ Crear Cuenta e Ingresar</span>';
    }
};

document.getElementById('btn-logout').addEventListener('click', () => {
    destroyAllCharts();
    if (currentUser) {
        logActivity('usuario', 'Cierre de Sesión', `El usuario ${currentUser.nombre} cerró su sesión.`);
    }
    localStorage.removeItem('fastmile_usuario');
    localStorage.removeItem('fastmile_rol');
    localStorage.removeItem('fastmile_id');
    currentUser = null;
    showToast('Sesión cerrada correctamente', 'info');
    showLogin();
});

function showLogin() {
    destroyAllCharts();
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    switchAuthTab('login');
}

function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');

    // Actualizar perfil de usuario en header
    const displayName = document.getElementById('user-display');
    const roleBadge = document.getElementById('user-role-badge');
    const avatar = document.getElementById('user-avatar-initials');

    if (displayName) displayName.textContent = currentUser.nombre;
    if (avatar) avatar.textContent = currentUser.nombre.substring(0, 2).toUpperCase();

    const isAdmin = currentUser.rol === 'admin';

    if (roleBadge) {
        roleBadge.textContent = currentUser.rol.toUpperCase();
        roleBadge.className = isAdmin ? 'role-pill role-admin' : 'role-pill role-user';
    }

    // CONTROL ESTRICTO DE VISIBILIDAD DE MENÚ POR ROL
    const navDashboard = document.getElementById('nav-btn-dashboard');
    const navEditorCatalogo = document.getElementById('nav-btn-editor-catalogo');
    const navDespacho = document.getElementById('nav-btn-despacho');
    const navUsuarios = document.getElementById('nav-btn-usuarios');
    const navActividades = document.getElementById('nav-btn-actividades');
    const adminBadges = document.querySelectorAll('.nav-badge.admin-only');

    if (!isAdmin) {
        // VISTA USUARIO CLIENTE (USER): Ocultar paneles administrativos y actividades
        if (navDashboard) navDashboard.style.display = 'none';
        if (navEditorCatalogo) navEditorCatalogo.style.display = 'none';
        if (navDespacho) navDespacho.style.display = 'none';
        if (navUsuarios) navUsuarios.style.display = 'none';
        if (navActividades) navActividades.style.display = 'none'; // SOLICITUD: Solo admin ve actividades
        adminBadges.forEach(b => b.style.display = 'none');
        loadView('catalogo');
    } else {
        // VISTA ADMINISTRADOR (ADMIN): Mostrar todos los módulos
        if (navDashboard) navDashboard.style.display = 'flex';
        if (navEditorCatalogo) navEditorCatalogo.style.display = 'flex';
        if (navDespacho) navDespacho.style.display = 'flex';
        if (navUsuarios) navUsuarios.style.display = 'flex';
        if (navActividades) navActividades.style.display = 'flex';
        adminBadges.forEach(b => b.style.display = 'inline-block');
        loadView('dashboard');
    }

    // Eventos limpios en botones de navegación (Sin cerrar el menú en computadoras)
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = (e) => {
            const targetBtn = e.currentTarget;
            const viewName = targetBtn.dataset.view;
            if (viewName) {
                loadView(viewName);
                // Solo cerrar el menú desplegable en celulares (< 768px)
                if (window.innerWidth <= 768) {
                    closeMobileSidebar();
                }
            }
        };
    });

    checkApiHealth();
}

// ============================================================================
// NAVEGACIÓN ENTRE VISTAS ESTABLE (NUNCA SE ROMPE)
// ============================================================================
async function loadView(viewName) {
    // 1. Limpieza total de instancias de Chart.js antes de cambiar el DOM
    destroyAllCharts();

    // 2. Actualizar estado visual de los botones del menú
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:280px; flex-direction:column; gap:16px;">
            <div style="width:44px; height:44px; border:4px solid #dbeafe; border-top-color:#1d4ed8; border-radius:50%; animation:spin 1s linear infinite;"></div>
            <p style="color:#64748b; font-weight:600; font-size:0.95rem;">Cargando FastMile...</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    // 3. Protección estricta de acceso: User NO puede ver Dashboard, Despacho, Usuarios, Actividades ni Editor Catálogo
    if (currentUser.rol === 'user' && ['dashboard', 'despacho', 'usuarios', 'actividades', 'editor-catalogo'].includes(viewName)) {
        content.innerHTML = `
            <div class="card" style="text-align:center; padding:50px;">
                <div style="font-size:3rem; margin-bottom:12px;">🔒</div>
                <h2 style="color:var(--blue-navy);">Acceso Restringido</h2>
                <p style="color:var(--text-secondary); margin-top:8px;">Este módulo es de uso exclusivo para Administradores de la plataforma.</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="loadView('catalogo')">Volver al Catálogo</button>
            </div>
        `;
        return;
    }

    try {
        if (viewName === 'dashboard') await renderDashboard(content);
        else if (viewName === 'catalogo') await renderCatalogo(content);
        else if (viewName === 'editor-catalogo') await renderEditorCatalogo(content);
        else if (viewName === 'pedidos') await renderPedidos(content);
        else if (viewName === 'despacho') await renderDespacho(content);
        else if (viewName === 'promociones') await renderPromociones(content);
        else if (viewName === 'usuarios') await renderUsuarios(content);
        else if (viewName === 'actividades') await renderActividades(content);
    } catch (err) {
        console.error('Error renderizando vista:', err);
        content.innerHTML = `
            <div class="card" style="padding:40px; text-align:center;">
                <div style="font-size:3rem; margin-bottom:12px;">⚠️</div>
                <h3 style="color:var(--blue-navy);">Vista disponible en modo demostración</h3>
                <p style="color:var(--text-secondary); margin:12px 0;">No se pudo conectar a la base de datos MySQL, pero la interfaz sigue activa.</p>
                <button class="btn btn-primary" onclick="loadView('${viewName}')">🔄 Reintentar</button>
            </div>
        `;
    }
}

// ============================================================================
// 1. MÓDULO DASHBOARD ANALÍTICO (Admin)
// ============================================================================
async function renderDashboard(container) {
    let dashboardData = {
        pedidos: [{ estado: 'Pendiente', total: 2 }, { estado: 'Completado', total: 6 }],
        motociclistas: [{ estado: 'Libre', total: 3 }, { estado: 'Ocupado', total: 0 }],
        tendencia_horaria: [
            { bloque_horario: '00:00', total: 2 },
            { bloque_horario: '06:00', total: 5 },
            { bloque_horario: '12:00', total: 18 },
            { bloque_horario: '18:00', total: 24 }
        ]
    };

    try {
        const res = await fetch(`${API_URL}/reportes/dashboard`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
            const apiRes = await res.json();
            if (apiRes.data) dashboardData = apiRes.data;
        }
    } catch (e) {
        console.warn('Dashboard usando datos de respaldo:', e);
    }

    const totalPedidos = dashboardData.pedidos.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
    const pedidosPendientes = Number(dashboardData.pedidos.find(p => p.estado === 'Pendiente')?.total || 0);
    const pedidosCompletados = Number(dashboardData.pedidos.find(p => p.estado === 'Completado')?.total || 0);
    const motosLibres = Number(dashboardData.motociclistas.find(m => m.estado === 'Libre')?.total || 0);
    const motosOcupados = Number(dashboardData.motociclistas.find(m => m.estado === 'Ocupado')?.total || 0);
    const totalMotos = motosLibres + motosOcupados;

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>📊 Dashboard Analítico</h2>
                <p>Métricas operacionales y monitoreo en tiempo real de FastMile</p>
            </div>
            <div class="view-actions">
                <button class="btn btn-secondary btn-sm" onclick="loadView('dashboard')">
                    🔄 Actualizar Datos
                </button>
            </div>
        </div>

        <!-- KPI CARDS -->
        <div class="kpi-grid">
            <div class="kpi-card kpi-blue">
                <div class="kpi-icon-box">📦</div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Pedidos</span>
                    <span class="kpi-val">${totalPedidos}</span>
                    <span class="kpi-subtext">Histórico acumulado</span>
                </div>
            </div>

            <div class="kpi-card kpi-yellow">
                <div class="kpi-icon-box">⏳</div>
                <div class="kpi-info">
                    <span class="kpi-label">Pedidos Pendientes</span>
                    <span class="kpi-val">${pedidosPendientes}</span>
                    <span class="kpi-subtext">Requieren despacho</span>
                </div>
            </div>

            <div class="kpi-card kpi-green">
                <div class="kpi-icon-box">🏍️</div>
                <div class="kpi-info">
                    <span class="kpi-label">Flota Disponible</span>
                    <span class="kpi-val">${motosLibres} / ${totalMotos}</span>
                    <span class="kpi-subtext">Unidades en estado Libre</span>
                </div>
            </div>

            <div class="kpi-card kpi-purple">
                <div class="kpi-icon-box">✅</div>
                <div class="kpi-info">
                    <span class="kpi-label">Entregas Exitosas</span>
                    <span class="kpi-val">${pedidosCompletados}</span>
                    <span class="kpi-subtext">Completadas sin retraso</span>
                </div>
            </div>
        </div>

        <!-- GRÁFICOS CHART.JS -->
        <div class="dashboard-charts-grid">
            <div class="chart-card">
                <div class="card-header">
                    <h3>📦 Distribución de Pedidos por Estado</h3>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="chartPedidos"></canvas>
                </div>
            </div>

            <div class="chart-card">
                <div class="card-header">
                    <h3>🏍️ Disponibilidad de la Flota</h3>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="chartMotos"></canvas>
                </div>
            </div>
        </div>

        <div class="chart-card">
            <div class="card-header">
                <h3>📈 Tendencia de Demanda por Bloque Horario</h3>
            </div>
            <div class="chart-canvas-wrapper">
                <canvas id="chartTendencia"></canvas>
            </div>
        </div>
    `;

    // Renderizar gráficos de manera segura con requestAnimationFrame
    requestAnimationFrame(() => {
        if (typeof Chart === 'undefined') return;

        // 1. Gráfico de Pedidos
        const canvasPedidos = document.getElementById('chartPedidos');
        if (canvasPedidos) {
            try {
                charts.pedidos = new Chart(canvasPedidos.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: dashboardData.pedidos.map(p => p.estado),
                        datasets: [{
                            label: 'Cantidad de Pedidos',
                            data: dashboardData.pedidos.map(p => p.total),
                            backgroundColor: ['#f59e0b', '#2563eb', '#10b981', '#ef4444'],
                            borderRadius: 8,
                            barPercentage: 0.6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            } catch (e) {
                console.error('Error Chart Pedidos:', e);
            }
        }

        // 2. Gráfico de Motociclistas
        const canvasMotos = document.getElementById('chartMotos');
        if (canvasMotos) {
            try {
                charts.motos = new Chart(canvasMotos.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: dashboardData.motociclistas.map(m => m.estado),
                        datasets: [{
                            data: dashboardData.motociclistas.map(m => m.total),
                            backgroundColor: ['#10b981', '#ef4444'],
                            borderWidth: 4,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            } catch (e) {
                console.error('Error Chart Motos:', e);
            }
        }

        // 3. Gráfico de Líneas
        const canvasTendencia = document.getElementById('chartTendencia');
        if (canvasTendencia) {
            try {
                charts.tendencia = new Chart(canvasTendencia.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: dashboardData.tendencia_horaria.map(t => t.bloque_horario),
                        datasets: [{
                            label: 'Pedidos en el Horario',
                            data: dashboardData.tendencia_horaria.map(t => t.total),
                            borderColor: '#1d4ed8',
                            backgroundColor: 'rgba(29, 78, 216, 0.08)',
                            pointBackgroundColor: '#fbbf24',
                            pointBorderColor: '#0d2249',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            tension: 0.35,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                            x: { grid: { color: '#e2e8f0' } }
                        }
                    }
                });
            } catch (e) {
                console.error('Error Chart Tendencia:', e);
            }
        }
    });
}

// ============================================================================
// 2. MÓDULO CATÁLOGO & LOCALES
// ============================================================================
async function renderCatalogo(container) {
    try {
        const res = await fetch(`${API_URL}/locales?rol=${currentUser.rol}`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            cachedLocales = data.data || [];
        }
    } catch (e) {
        console.warn('Usando catálogo local');
    }

    if (cachedLocales.length === 0) {
        cachedLocales = [
            {
                id: 1,
                nombre: 'Panchita',
                direccion: 'Av. Principal 123, Centro',
                coord_x: 25,
                coord_y: 30,
                productos: [
                    { id: 1, nombre: 'Pancho Clásico', descripcion: 'Pancho con mostaza y ketchup', precio: 3.50, nuevo_precio: 3.50, descuento_porcentaje: 0 },
                    { id: 2, nombre: 'Pancho Especial', descripcion: 'Pancho con tocino, queso y papas', precio: 5.00, nuevo_precio: 4.25, descuento_porcentaje: 15 }
                ]
            },
            {
                id: 2,
                nombre: 'Polloscoco',
                direccion: 'Calle del Sabor 456, Norte',
                coord_x: 75,
                coord_y: 80,
                productos: [
                    { id: 3, nombre: 'Combo Familiar', descripcion: '1 Pollo entero + papas + gaseosa 1.5L', precio: 15.00, nuevo_precio: 13.50, descuento_porcentaje: 10 },
                    { id: 4, nombre: 'Alitas BBQ', descripcion: 'Porción de 8 alitas con salsa BBQ', precio: 8.00, nuevo_precio: 8.00, descuento_porcentaje: 0 }
                ]
            }
        ];
    }

    const isAdmin = currentUser.rol === 'admin';

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>🏪 Catálogo de Locales & Productos</h2>
                <p>Explora locales asociados y productos disponibles para delivery</p>
            </div>
            <div class="view-actions">
                ${isAdmin ? `
                    <button class="btn btn-primary btn-sm" onclick="openModal('modal-nuevo-local')">
                        ➕ Nuevo Local
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="openModalAgregarProducto()">
                        🍔 Nuevo Producto
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="loadView('editor-catalogo')">
                        ✏️ Editor Maestro
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y FILTRO -->
        <div class="search-filter-card">
            <div class="search-box">
                <span class="search-icon-symbol">🔍</span>
                <input type="text" id="catalogo-search-input" placeholder="Buscar por local o producto..." oninput="filtrarCatalogo()">
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); font-weight:600;">
                <span id="locales-count-label">${cachedLocales.length}</span> locales disponibles
            </div>
        </div>

        <!-- GRID DE CARDS DE LOCALES -->
        <div class="locales-grid" id="locales-grid-container">
            ${renderLocalesCards(cachedLocales, isAdmin)}
        </div>
    `;
}

function renderLocalesCards(localesList, isAdmin) {
    if (localesList.length === 0) {
        return `
            <div class="card" style="grid-column: 1 / -1; text-align:center; padding:40px;">
                <p style="color:var(--text-muted); font-size:1.1rem;">No se encontraron locales o productos.</p>
            </div>
        `;
    }

    return localesList.map(local => `
        <div class="local-card card-lift">
            <div class="local-card-top">
                <span class="local-badge-coords">📍 (${local.coord_x ?? 'N/A'}, ${local.coord_y ?? 'N/A'})</span>
                <h3 class="local-name">
                    ${local.nombre}
                    ${isAdmin && local.id ? `<small style="font-size:0.75rem; opacity:0.8;">[ID #${local.id}]</small>` : ''}
                </h3>
                <p class="local-address">🏢 ${local.direccion}</p>
                ${isAdmin && local.id ? `
                    <div style="margin-top:8px; display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:0.72rem;" onclick="openModalEditarLocal(${local.id})">
                            ✏️ Editar Local
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="products-list-wrapper">
                ${(local.productos && local.productos.length > 0) ? local.productos.map(p => `
                    <div class="product-item-row">
                        <div class="prod-info-col">
                            <span class="prod-title">
                                🍕 ${p.nombre}
                                ${p.descuento_porcentaje > 0 ? `<span class="badge-discount">-${p.descuento_porcentaje}%</span>` : ''}
                            </span>
                            <span class="prod-desc">${p.descripcion || 'Sin descripción adicional'}</span>
                        </div>
                        <div class="prod-price-col">
                            ${p.descuento_porcentaje > 0 ? `<span class="price-original">Bs. ${Number(p.precio).toFixed(2)}</span>` : ''}
                            <span class="price-current">Bs. ${Number(p.nuevo_precio).toFixed(2)}</span>
                            
                            <div style="display:flex; gap:6px; margin-top:4px;">
                                <button class="btn btn-warning btn-sm" style="padding:3px 8px; font-size:0.75rem;" onclick="pedirProductoDirecto(${local.id || 1}, ${p.id || 1}, '${p.nombre}')">
                                    🛒 Pedir
                                </button>
                                ${isAdmin ? `
                                    <button class="btn btn-secondary btn-sm" style="padding:3px 6px; font-size:0.72rem;" onclick="openModalEditarProducto(${p.id})">
                                        ✏️ Editar
                                    </button>
                                    <button class="btn btn-secondary btn-sm" style="padding:3px 6px; font-size:0.72rem;" onclick="openModalDescuento(${p.id}, '${p.nombre}', ${p.precio})">
                                        🏷️ Descuento
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('') : '<p style="color:var(--text-muted); font-size:0.85rem; padding:10px 0;">No hay productos cargados en este local.</p>'}
            </div>
        </div>
    `).join('');
}

window.filtrarCatalogo = function() {
    const query = document.getElementById('catalogo-search-input')?.value.toLowerCase().trim() || '';
    const container = document.getElementById('locales-grid-container');
    const isAdmin = currentUser.rol === 'admin';

    if (!query) {
        container.innerHTML = renderLocalesCards(cachedLocales, isAdmin);
        return;
    }

    const filtrados = cachedLocales.filter(l => {
        const coincideLocal = l.nombre.toLowerCase().includes(query) || l.direccion.toLowerCase().includes(query);
        const coincideProducto = l.productos?.some(p => p.nombre.toLowerCase().includes(query));
        return coincideLocal || coincideProducto;
    });

    container.innerHTML = renderLocalesCards(filtrados, isAdmin);
};

window.pedirProductoDirecto = function(localId, prodId, prodNombre) {
    loadView('pedidos').then(() => {
        setTimeout(() => {
            const inputLocal = document.getElementById('p-local');
            const inputProd = document.getElementById('p-prod');
            if (inputLocal) inputLocal.value = localId;
            if (inputProd) inputProd.value = prodId;
            showToast(`Seleccionado: ${prodNombre} para tu pedido`, 'info');
        }, 200);
    });
};

// ============================================================================
// 2.B. MÓDULO EXCLUSIVO ADMIN: EDITOR MAESTRO DE CATÁLOGOS
// ============================================================================
async function renderEditorCatalogo(container) {
    // PROTECCIÓN ESTRICTA: Solo Admin puede acceder a este módulo
    if (currentUser.rol !== 'admin') {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding:50px;">
                <div style="font-size:3.5rem; margin-bottom:12px;">🔒</div>
                <h2 style="color:var(--blue-navy);">Acceso Exclusivo de Administrador</h2>
                <p style="color:var(--text-secondary); margin-top:8px;">Solo los usuarios con rol Administrador pueden editar tiendas y productos del catálogo.</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="loadView('catalogo')">Volver al Catálogo</button>
            </div>
        `;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/locales?rol=admin`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            cachedLocales = data.data || [];
        }
    } catch (e) {
        console.warn('Editor catálogo: usando datos en memoria');
    }

    // Métricas para KPIs
    let totalProductos = 0;
    let productosConDescuento = 0;
    cachedLocales.forEach(l => {
        if (l.productos) {
            totalProductos += l.productos.length;
            productosConDescuento += l.productos.filter(p => p.descuento_porcentaje > 0).length;
        }
    });

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>✏️ Editor Maestro de Catálogos</h2>
                <p>Módulo exclusivo de Administrador para modificar, actualizar y dar de baja tiendas y productos</p>
            </div>
            <div class="view-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="loadView('editor-catalogo')">
                    🔄 Refrescar
                </button>
                <button class="btn btn-primary btn-sm" onclick="openModal('modal-nuevo-local')">
                    ➕ Nuevo Local
                </button>
                <button class="btn btn-warning btn-sm" onclick="openModalAgregarProducto()">
                    🍔 Nuevo Producto
                </button>
            </div>
        </div>

        <!-- KPI CARDS DEL CATÁLOGO -->
        <div class="kpi-grid" style="margin-bottom:24px;">
            <div class="kpi-card kpi-blue">
                <div class="kpi-icon-box">🏪</div>
                <div class="kpi-info">
                    <span class="kpi-label">Locales Comerciales</span>
                    <span class="kpi-val">${cachedLocales.length}</span>
                    <span class="kpi-subtext">Tiendas operativas</span>
                </div>
            </div>

            <div class="kpi-card kpi-yellow">
                <div class="kpi-icon-box">🍕</div>
                <div class="kpi-info">
                    <span class="kpi-label">Productos Activos</span>
                    <span class="kpi-val">${totalProductos}</span>
                    <span class="kpi-subtext">Ítems en catálogo</span>
                </div>
            </div>

            <div class="kpi-card kpi-green">
                <div class="kpi-icon-box">🏷️</div>
                <div class="kpi-info">
                    <span class="kpi-label">En Descuento</span>
                    <span class="kpi-val">${productosConDescuento}</span>
                    <span class="kpi-subtext">Con rebajas activas</span>
                </div>
            </div>

            <div class="kpi-card kpi-purple">
                <div class="kpi-icon-box">🛡️</div>
                <div class="kpi-info">
                    <span class="kpi-label">Nivel de Control</span>
                    <span class="kpi-val">ADMIN</span>
                    <span class="kpi-subtext">Edición y Baja Total</span>
                </div>
            </div>
        </div>

        <!-- SECCIÓN 1: EDICIÓN DE LOCALES COMERCIALES -->
        <div class="card" style="margin-bottom:28px;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.4rem;">🏪</span>
                    <div>
                        <h3 style="margin:0; font-size:1.15rem; color:var(--blue-navy);">Locales Comerciales & Coordenadas</h3>
                        <p style="margin:2px 0 0; font-size:0.82rem; color:var(--text-secondary);">Modifica el nombre, dirección o ubicación cartesiana (X, Y)</p>
                    </div>
                </div>
            </div>

            <div class="data-table-container" style="margin-top:14px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre Comercial</th>
                            <th>Dirección</th>
                            <th>Coordenadas (X, Y)</th>
                            <th>Productos</th>
                            <th style="text-align:right;">Acciones Administrativas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cachedLocales.map(local => {
                            const prodsCount = local.productos ? local.productos.length : 0;
                            return `
                                <tr>
                                    <td><strong class="tag-badge tag-despacho">#${local.id || 'N/A'}</strong></td>
                                    <td><strong style="color:var(--blue-navy);">${local.nombre}</strong></td>
                                    <td>${local.direccion}</td>
                                    <td><span class="tag-badge tag-pedido">📍 (${local.coord_x ?? 0}, ${local.coord_y ?? 0})</span></td>
                                    <td><span class="status-badge status-en-camino">${prodsCount} productos</span></td>
                                    <td style="text-align:right;">
                                        <div style="display:inline-flex; gap:6px;">
                                            <button class="btn btn-secondary btn-sm" onclick="openModalEditarLocal(${local.id})">
                                                ✏️ Editar
                                            </button>
                                            <button class="btn btn-outline-danger btn-sm" onclick="confirmEliminarLocal(${local.id}, '${local.nombre.replace(/'/g, "\\'")}')">
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECCIÓN 2: EDICIÓN DE PRODUCTOS DEL CATÁLOGO -->
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.4rem;">🍕</span>
                    <div>
                        <h3 style="margin:0; font-size:1.15rem; color:var(--blue-navy);">Catálogo de Productos</h3>
                        <p style="margin:2px 0 0; font-size:0.82rem; color:var(--text-secondary);">Modifica precios en bolivianos (Bs.), descripciones y porcentajes de descuento</p>
                    </div>
                </div>

                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <label style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">Filtrar por local:</label>
                    <select id="editor-filter-local" class="form-input" style="padding:6px 12px; font-size:0.85rem; width:auto;" onchange="filtrarProductosEditor(this.value)">
                        <option value="todos">Todos los locales</option>
                        ${cachedLocales.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="data-table-container" style="margin-top:14px;">
                <table class="data-table" id="editor-table-productos">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Local</th>
                            <th>Producto</th>
                            <th>Descripción</th>
                            <th>Precio Base</th>
                            <th>Descuento</th>
                            <th>Precio Final (Bs.)</th>
                            <th style="text-align:right;">Acciones Administrativas</th>
                        </tr>
                    </thead>
                    <tbody id="editor-tbody-productos">
                        ${renderEditorProductosRows(cachedLocales, 'todos')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderEditorProductosRows(locales, filtroLocalId) {
    let prods = [];
    locales.forEach(l => {
        if (filtroLocalId !== 'todos' && String(l.id) !== String(filtroLocalId)) return;
        if (l.productos && l.productos.length > 0) {
            l.productos.forEach(p => {
                prods.push({ ...p, localNombre: l.nombre, localId: l.id });
            });
        }
    });

    if (prods.length === 0) {
        return `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No hay productos registrados en este local.</td></tr>`;
    }

    return prods.map(p => {
        const descPorc = p.descuento_porcentaje || 0;
        const precioBase = Number(p.precio).toFixed(2);
        const precioFinal = Number(p.nuevo_precio || p.precio).toFixed(2);

        return `
            <tr>
                <td><strong class="tag-badge tag-despacho">#${p.id || 'N/A'}</strong></td>
                <td><span class="tag-badge tag-pedido">${p.localNombre}</span></td>
                <td><strong style="color:var(--blue-navy);">${p.nombre}</strong></td>
                <td style="color:var(--text-secondary); max-width:240px; font-size:0.84rem;">${p.descripcion || 'Sin descripción'}</td>
                <td><span style="color:var(--text-secondary);">Bs. ${precioBase}</span></td>
                <td>
                    ${descPorc > 0 
                        ? `<span class="badge-discount" style="font-size:0.75rem;">-${descPorc}%</span>` 
                        : `<span style="color:var(--text-muted); font-size:0.8rem;">0%</span>`}
                </td>
                <td><strong style="color:var(--blue-navy); font-size:0.95rem;">Bs. ${precioFinal}</strong></td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="openModalEditarProducto(${p.id})">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="openModalDescuento(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio})">
                            🏷️ Rebaja
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="confirmEliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.filtrarProductosEditor = function(localId) {
    const tbody = document.getElementById('editor-tbody-productos');
    if (tbody) {
        tbody.innerHTML = renderEditorProductosRows(cachedLocales, localId);
    }
};

// --- HANDLERS PARA EDICIÓN Y ELIMINACIÓN DE LOCALES ---

window.openModalEditarLocal = function(localId) {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden editar locales', 'error');
        return;
    }

    const local = cachedLocales.find(l => l.id == localId);
    if (!local) {
        showToast('Local no encontrado en el sistema', 'error');
        return;
    }

    document.getElementById('edit-local-id').value = local.id;
    document.getElementById('edit-local-nombre').value = local.nombre;
    document.getElementById('edit-local-direccion').value = local.direccion;
    document.getElementById('edit-local-x').value = local.coord_x ?? 25;
    document.getElementById('edit-local-y').value = local.coord_y ?? 30;

    openModal('modal-editar-local');
};

window.handleGuardarEditarLocal = async function(e) {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden editar locales', 'error');
        return;
    }

    const localId = document.getElementById('edit-local-id').value;
    const body = {
        nombre: document.getElementById('edit-local-nombre').value.trim(),
        direccion: document.getElementById('edit-local-direccion').value.trim(),
        coord_x: parseFloat(document.getElementById('edit-local-x').value),
        coord_y: parseFloat(document.getElementById('edit-local-y').value)
    };

    if (body.coord_x < 0 || body.coord_x > 100 || body.coord_y < 0 || body.coord_y > 100) {
        showToast('Las coordenadas deben estar entre 0 y 100', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/locales/${localId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('local', 'Local Actualizado', `Se modificó el local "${body.nombre}" (ID #${localId}).`);
            showToast('Local comercial actualizado exitosamente', 'success');
            
            // Actualizar en cache local
            const idx = cachedLocales.findIndex(l => l.id == localId);
            if (idx !== -1) {
                cachedLocales[idx] = { ...cachedLocales[idx], ...body };
            }

            closeModal('modal-editar-local');
            const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
            loadView(activeView);
        } else {
            showToast(data.message || 'Error al actualizar local', 'error');
        }
    } catch (err) {
        // Modo offline / local
        const idx = cachedLocales.findIndex(l => l.id == localId);
        if (idx !== -1) {
            cachedLocales[idx] = { ...cachedLocales[idx], ...body };
        }
        logActivity('local', 'Local Actualizado (Local)', `Se modificó "${body.nombre}" en memoria.`);
        showToast('Local actualizado (modo local)', 'info');
        closeModal('modal-editar-local');
        const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
        loadView(activeView);
    }
};

window.confirmEliminarLocal = async function(localId, localNombre) {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden eliminar locales', 'error');
        return;
    }

    if (!confirm(`⚠️ ¿Estás seguro de que deseas eliminar el local "${localNombre}" (ID #${localId}) y todos sus productos? Esta acción es irreversible.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/locales/${localId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('local', 'Local Eliminado', `Se dio de baja el local "${localNombre}" (ID #${localId}).`);
            showToast(`Local "${localNombre}" eliminado correctamente`, 'success');
            cachedLocales = cachedLocales.filter(l => l.id != localId);
            const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
            loadView(activeView);
        } else {
            showToast(data.message || 'No se pudo eliminar el local', 'error');
        }
    } catch (err) {
        cachedLocales = cachedLocales.filter(l => l.id != localId);
        logActivity('local', 'Local Eliminado (Local)', `Se eliminó "${localNombre}".`);
        showToast(`Local "${localNombre}" eliminado (modo local)`, 'info');
        const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
        loadView(activeView);
    }
};

// --- HANDLERS PARA EDICIÓN Y ELIMINACIÓN DE PRODUCTOS ---

window.openModalEditarProducto = function(prodId) {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden editar productos', 'error');
        return;
    }

    let productoEncontrado = null;
    let localDelProd = null;

    for (const local of cachedLocales) {
        if (local.productos) {
            const p = local.productos.find(x => x.id == prodId);
            if (p) {
                productoEncontrado = p;
                localDelProd = local;
                break;
            }
        }
    }

    if (!productoEncontrado) {
        showToast('Producto no encontrado en el catálogo', 'error');
        return;
    }

    // Poblar selector de locales
    const selectLocal = document.getElementById('edit-prod-local-id');
    if (selectLocal) {
        selectLocal.innerHTML = cachedLocales.map(l => `
            <option value="${l.id}" ${l.id === localDelProd.id ? 'selected' : ''}>${l.nombre}</option>
        `).join('');
    }

    document.getElementById('edit-prod-id').value = productoEncontrado.id;
    document.getElementById('edit-prod-nombre').value = productoEncontrado.nombre;
    document.getElementById('edit-prod-desc').value = productoEncontrado.descripcion || '';
    document.getElementById('edit-prod-precio').value = productoEncontrado.precio;
    document.getElementById('edit-prod-descuento').value = productoEncontrado.descuento_porcentaje || 0;

    previewEditProdPrecio();
    openModal('modal-editar-producto');
};

window.previewEditProdPrecio = function() {
    const precio = parseFloat(document.getElementById('edit-prod-precio')?.value) || 0;
    const desc = parseFloat(document.getElementById('edit-prod-descuento')?.value) || 0;
    const finalVal = precio * (1 - (desc / 100));
    const previewEl = document.getElementById('edit-prod-preview-val');
    if (previewEl) {
        previewEl.textContent = `Bs. ${Math.max(0, finalVal).toFixed(2)}`;
    }
};

window.handleGuardarEditarProducto = async function(e) {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden editar productos', 'error');
        return;
    }

    const prodId = document.getElementById('edit-prod-id').value;
    const targetLocalId = parseInt(document.getElementById('edit-prod-local-id').value);
    const body = {
        local_id: targetLocalId,
        nombre: document.getElementById('edit-prod-nombre').value.trim(),
        descripcion: document.getElementById('edit-prod-desc').value.trim(),
        precio: parseFloat(document.getElementById('edit-prod-precio').value),
        descuento_porcentaje: parseInt(document.getElementById('edit-prod-descuento').value) || 0
    };

    if (isNaN(body.precio) || body.precio <= 0) {
        showToast('Ingresa un precio válido en bolivianos (Bs.) mayor a cero', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/productos/${prodId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('producto', 'Producto Actualizado', `Se actualizó "${body.nombre}" (ID #${prodId}) a Bs. ${body.precio.toFixed(2)}.`);
            showToast('Producto actualizado exitosamente', 'success');

            // Actualizar en cache local
            actualizarProductoEnCache(prodId, targetLocalId, body);

            closeModal('modal-editar-producto');
            const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
            loadView(activeView);
        } else {
            showToast(data.message || 'Error al actualizar producto', 'error');
        }
    } catch (err) {
        // Fallback local
        actualizarProductoEnCache(prodId, targetLocalId, body);
        logActivity('producto', 'Producto Actualizado (Local)', `Se modificó "${body.nombre}" en memoria.`);
        showToast('Producto actualizado (modo local)', 'info');
        closeModal('modal-editar-producto');
        const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
        loadView(activeView);
    }
};

function actualizarProductoEnCache(prodId, targetLocalId, body) {
    let prodObj = null;
    // Remover de local previo si cambió de local
    cachedLocales.forEach(l => {
        if (l.productos) {
            const idx = l.productos.findIndex(p => p.id == prodId);
            if (idx !== -1) {
                prodObj = { ...l.productos[idx] };
                l.productos.splice(idx, 1);
            }
        }
    });

    const nuevoPrecio = Number((body.precio * (1 - body.descuento_porcentaje / 100)).toFixed(2));
    const targetLocal = cachedLocales.find(l => l.id == targetLocalId) || cachedLocales[0];
    if (targetLocal) {
        targetLocal.productos = targetLocal.productos || [];
        targetLocal.productos.push({
            id: Number(prodId),
            local_id: targetLocal.id,
            nombre: body.nombre,
            descripcion: body.descripcion,
            precio: body.precio,
            nuevo_precio: nuevoPrecio,
            descuento_porcentaje: body.descuento_porcentaje
        });
    }
}

window.confirmEliminarProducto = async function(prodId, prodNombre) {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden eliminar productos', 'error');
        return;
    }

    if (!confirm(`⚠️ ¿Estás seguro de eliminar el producto "${prodNombre}" (ID #${prodId}) del catálogo?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/productos/${prodId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('producto', 'Producto Eliminado', `Se eliminó el producto "${prodNombre}" (ID #${prodId}).`);
            showToast(`Producto "${prodNombre}" eliminado correctamente`, 'success');

            // Remover de cachedLocales
            cachedLocales.forEach(l => {
                if (l.productos) {
                    l.productos = l.productos.filter(p => p.id != prodId);
                }
            });

            const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
            loadView(activeView);
        } else {
            showToast(data.message || 'No se pudo eliminar el producto', 'error');
        }
    } catch (err) {
        cachedLocales.forEach(l => {
            if (l.productos) {
                l.productos = l.productos.filter(p => p.id != prodId);
            }
        });
        logActivity('producto', 'Producto Eliminado (Local)', `Se eliminó "${prodNombre}".`);
        showToast(`Producto "${prodNombre}" eliminado (modo local)`, 'info');
        const activeView = document.querySelector('.nav-item.active')?.dataset.view || 'editor-catalogo';
        loadView(activeView);
    }
};

// ============================================================================
// 3. MÓDULO PEDIDOS & COTIZADOR
// ============================================================================
async function renderPedidos(container) {
    let pedidos = [];
    try {
        const res = await fetch(`${API_URL}/pedidos`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            pedidos = data.data || [];
            cachedPedidos = pedidos;
        }
    } catch (e) {
        console.warn('Usando pedidos en cache');
    }

    if (pedidos.length === 0 && cachedPedidos.length > 0) {
        pedidos = cachedPedidos;
    } else if (pedidos.length === 0) {
        pedidos = [
            { id: 101, local_id: 1, producto_id: 1, cliente_x: 35, cliente_y: 45, estado: 'Pendiente', distancia_km: 4.5 },
            { id: 100, local_id: 2, producto_id: 3, motociclista_id: 1, cliente_x: 80, cliente_y: 70, estado: 'Completado', distancia_km: 8.2 }
        ];
        cachedPedidos = pedidos;
    }

    const isAdmin = currentUser.rol === 'admin';

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>📦 Gestión de Pedidos & Cotizador</h2>
                <p>Calcula tarifas de despacho y gestiona el flujo de órdenes</p>
            </div>
            <div class="view-actions">
                <button class="btn btn-secondary btn-sm" onclick="loadView('pedidos')">🔄 Actualizar Lista</button>
            </div>
        </div>

        <div class="pedidos-top-grid">
            <!-- CARD 1: COTIZADOR INTERACTIVO DE TARIFAS -->
            <div class="card fare-calculator-box card-accent-yellow">
                <div class="card-header">
                    <h3>⚡ Cotizador Dinámico de Tarifas</h3>
                </div>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:14px;">
                    Fórmula oficial: <strong>Tarifa Base (Bs. 2.50) + (Bs. 1.25 / km)</strong>
                </p>

                <div class="form-group">
                    <label>Distancia Estimada (km):</label>
                    <div style="display:flex; gap:10px;">
                        <input type="number" id="distancia" step="0.1" min="0.1" value="5.0" class="form-input" style="flex:1;" oninput="calcularTarifaEnVivo()">
                        <button class="btn btn-warning" onclick="calcularTarifa()">Cotizar</button>
                    </div>
                </div>

                <div class="fare-calc-result" id="tarifa-result-box">
                    <div class="calc-breakdown">
                        <span>Base: Bs. 2.50 | Costo/km: Bs. 1.25</span>
                        <span id="tarifa-breakdown-dist">Distancia: 5.0 km</span>
                    </div>
                    <div class="calc-total-pill" id="tarifa-total-display">Bs. 8.75</div>
                </div>
            </div>

            <!-- CARD 2: CREACIÓN DE PEDIDO -->
            <div class="card card-accent-blue">
                <div class="card-header">
                    <h3>🛍️ Crear Nuevo Pedido</h3>
                </div>

                <form onsubmit="handleCrearPedido(event)">
                    <div class="form-row">
                        <div class="form-group col-half">
                            <label>Local ID *</label>
                            <input type="number" id="p-local" required class="form-input" placeholder="Ej: 1" value="${cachedLocales[0]?.id || 1}">
                        </div>
                        <div class="form-group col-half">
                            <label>Producto ID *</label>
                            <input type="number" id="p-prod" required class="form-input" placeholder="Ej: 1" value="1">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-half">
                            <label>Cliente Coord X (0-100) *</label>
                            <input type="number" id="p-x" min="0" max="100" step="0.1" required class="form-input" placeholder="60.0" value="60">
                        </div>
                        <div class="form-group col-half">
                            <label>Cliente Coord Y (0-100) *</label>
                            <input type="number" id="p-y" min="0" max="100" step="0.1" required class="form-input" placeholder="40.0" value="40">
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:10px;">
                        🚀 Confirmar y Enviar Pedido
                    </button>
                </form>
            </div>
        </div>

        <!-- LISTA DE PEDIDOS -->
        <div class="card">
            <div class="card-header">
                <h3>📋 ${isAdmin ? 'Todas las Órdenes en el Sistema' : 'Mis Órdenes Realizadas'}</h3>
                <span class="badge" style="background:var(--blue-tint); color:var(--blue-primary); font-weight:700;">
                    ${pedidos.length} órdenes
                </span>
            </div>

            <div class="orders-grid-cards">
                ${renderPedidosCards(pedidos, isAdmin)}
            </div>
        </div>
    `;

    calcularTarifaEnVivo();
}

function renderPedidosCards(pedidos, isAdmin) {
    if (pedidos.length === 0) {
        return `<p style="color:var(--text-muted); padding:20px; text-align:center; grid-column:1/-1;">No hay órdenes registradas aún.</p>`;
    }

    return pedidos.map(p => {
        let badgeClass = 'status-pendiente';
        if (p.estado === 'En camino') badgeClass = 'status-en-camino';
        if (p.estado === 'Completado') badgeClass = 'status-completado';

        return `
            <div class="order-item-card">
                <div class="order-card-header">
                    <span class="order-id-badge">Orden #${p.id}</span>
                    <span class="status-badge ${badgeClass}">${p.estado}</span>
                </div>

                <div style="font-size:0.88rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px;">
                    <div>🏢 Local ID: <strong>#${p.local_id}</strong> | Producto ID: <strong>#${p.producto_id}</strong></div>
                    <div>📍 Destino Cliente: <strong>(${p.cliente_x}, ${p.cliente_y})</strong></div>
                    ${p.distancia_km ? `<div>📏 Distancia: <strong>${Number(p.distancia_km).toFixed(2)} km</strong></div>` : ''}
                    ${p.total_envio ? `<div>💵 Costo Envío: <strong>Bs. ${Number(p.total_envio).toFixed(2)}</strong></div>` : ''}
                    ${p.motociclista_id ? `<div>🏍️ Repartidor Asignado: <strong>#${p.motociclista_id}</strong></div>` : ''}
                </div>

                <!-- CONTROL ESTRICTO: Solo el Admin puede Despachar o Completar pedidos -->
                ${isAdmin ? `
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:10px;">
                        ${p.estado === 'Pendiente' ? `
                            <button class="btn btn-warning btn-sm" onclick="despacharPedidoDirecto(${p.id})">
                                🏍️ Despachar Unidad
                            </button>
                        ` : ''}
                        ${p.estado === 'En camino' ? `
                            <button class="btn btn-primary btn-sm" onclick="completarPedidoDirecto(${p.id})">
                                ✅ Finalizar Entrega
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

window.calcularTarifaEnVivo = function() {
    const distInput = document.getElementById('distancia');
    const totalEl = document.getElementById('tarifa-total-display');
    const breakdownEl = document.getElementById('tarifa-breakdown-dist');
    if (!distInput || !totalEl) return;

    const dist = parseFloat(distInput.value) || 0;
    const total = 2.50 + (dist * 1.25);
    totalEl.textContent = `Bs. ${total.toFixed(2)}`;
    if (breakdownEl) breakdownEl.textContent = `Distancia: ${dist} km`;
};

window.calcularTarifa = async () => {
    const distInput = document.getElementById('distancia');
    const dist = parseFloat(distInput.value);
    if (isNaN(dist) || dist <= 0) {
        showToast('Por favor ingresa una distancia válida mayor a 0', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/pedidos/calcular-tarifa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ distancia_km: dist })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('tarifa-total-display').textContent = `Bs. ${data.data.total_envio.toFixed(2)}`;
            showToast(`Tarifa calculada: Bs. ${data.data.total_envio.toFixed(2)}`, 'success');
        }
    } catch (e) {
        calcularTarifaEnVivo();
    }
};

window.handleCrearPedido = async (e) => {
    e.preventDefault();
    const body = {
        local_id: parseInt(document.getElementById('p-local').value),
        producto_id: parseInt(document.getElementById('p-prod').value),
        cliente_x: parseFloat(document.getElementById('p-x').value),
        cliente_y: parseFloat(document.getElementById('p-y').value)
    };

    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('pedido', 'Nuevo Pedido Creado', `Pedido creado para Local #${body.local_id}, Producto #${body.producto_id} en (${body.cliente_x}, ${body.cliente_y}).`);
            showToast('¡Pedido creado exitosamente con estado Pendiente!', 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'Error al crear el pedido', 'error');
        }
    } catch (err) {
        // Modo offline
        const nuevo = { id: Date.now().toString().slice(-4), ...body, estado: 'Pendiente', distancia_km: 5.0 };
        cachedPedidos.unshift(nuevo);
        logActivity('pedido', 'Nuevo Pedido Creado (Local)', `Orden #${nuevo.id} registrada en ubicación (${body.cliente_x}, ${body.cliente_y}).`);
        showToast('Pedido creado exitosamente', 'success');
        loadView('pedidos');
    }
};

window.despacharPedidoDirecto = async (pedidoId) => {
    // REGLA DE SEGURIDAD: Solo Admin puede despachar
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo los administradores pueden despachar pedidos', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/despachar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('despacho', 'Despacho de Pedido', `Orden #${pedidoId} despachada a ${data.data.motociclista_asignado}.`);
            showToast(`¡Despachado! Repartidor asignado: ${data.data.motociclista_asignado}`, 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'No se pudo despachar el pedido', 'error');
        }
    } catch (e) {
        logActivity('despacho', 'Despacho de Pedido (Simulado)', `Orden #${pedidoId} asignada a unidad más cercana.`);
        showToast('Despacho simulado con éxito', 'success');
        const p = cachedPedidos.find(x => x.id == pedidoId);
        if (p) p.estado = 'En camino';
        loadView('pedidos');
    }
};

window.completarPedidoDirecto = async (pedidoId) => {
    // REGLA DE SEGURIDAD: Solo Admin puede finalizar entregas
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo los administradores pueden completar entregas', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/completar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('entrega', 'Entrega Completada', `Pedido #${pedidoId} entregado satisfactoriamente.`);
            showToast('¡Entrega completada! Repartidor liberado en nueva posición.', 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'Error al completar pedido', 'error');
        }
    } catch (e) {
        logActivity('entrega', 'Entrega Completada', `Pedido #${pedidoId} finalizado.`);
        const p = cachedPedidos.find(x => x.id == pedidoId);
        if (p) p.estado = 'Completado';
        showToast('Entrega completada con éxito', 'success');
        loadView('pedidos');
    }
};

// ============================================================================
// 4. MÓDULO DESPACHO & FLOTA CARTESIANA (0-100) (Solo Admin)
// ============================================================================
async function renderDespacho(container) {
    if (currentUser.rol !== 'admin') return;

    try {
        const resMotos = await fetch(`${API_URL}/motociclistas`, { signal: AbortSignal.timeout(2500) });
        if (resMotos.ok) {
            const dataMotos = await resMotos.json();
            cachedMotociclistas = dataMotos.data || [];
        }
    } catch (e) {
        console.warn('Usando motos en cache');
    }

    if (cachedMotociclistas.length === 0) {
        cachedMotociclistas = [
            { id: 1, nombre: 'Manolo', tipo_vehiculo: 'Moto', placa_o_id: 'MOT-001', estado: 'Libre', coord_x: 10, coord_y: 15 },
            { id: 2, nombre: 'Mario', tipo_vehiculo: 'Bici', placa_o_id: 'BIC-042', estado: 'Libre', coord_x: 50, coord_y: 50 },
            { id: 3, nombre: 'Jose', tipo_vehiculo: 'Moto', placa_o_id: 'MOT-099', estado: 'Libre', coord_x: 85, coord_y: 70 }
        ];
    }

    const pedidosPendientes = (cachedPedidos || []).filter(p => p.estado === 'Pendiente');

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>🏍️ Despacho & Cuadrante Cartesiano (0-100)</h2>
                <p>Visualización geográfica cartesiana y asignación por distancia euclidiana</p>
            </div>
            <div class="view-actions">
                <button class="btn btn-primary btn-sm" onclick="openModal('modal-nuevo-moto')">
                    ➕ Nuevo Repartidor
                </button>
                <button class="btn btn-secondary btn-sm" onclick="loadView('despacho')">
                    🔄 Recargar Mapa
                </button>
            </div>
        </div>

        <div class="despacho-layout-grid">
            <!-- COLUMNA IZQUIERDA: MAPA RADAR CARTESIANO -->
            <div class="radar-map-card">
                <div class="card-header">
                    <h3>🗺️ Plano Cartesiano de Despacho (Escala 0 a 100)</h3>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Ejes X/Y</span>
                </div>

                <div class="radar-canvas-container" id="radar-map-box">
                    <div class="radar-grid-bg"></div>
                    <div class="radar-axis-x"></div>
                    <div class="radar-axis-y"></div>

                    <!-- Puntos de Locales (Azules) -->
                    ${cachedLocales.map(l => `
                        <div class="map-marker marker-local" style="left:${l.coord_x}%; top:${l.coord_y}%;" title="Local: ${l.nombre} (${l.coord_x}, ${l.coord_y})">
                            🏪
                        </div>
                    `).join('')}

                    <!-- Puntos de Motociclistas (Verdes/Rojos) -->
                    ${cachedMotociclistas.map(m => `
                        <div class="map-marker marker-moto ${m.estado === 'Libre' ? 'marker-libre' : 'marker-ocupado'}" 
                             style="left:${m.coord_x}%; top:${m.coord_y}%;" 
                             title="${m.nombre} [${m.tipo_vehiculo}] - ${m.estado} en (${m.coord_x}, ${m.coord_y})">
                            ${m.tipo_vehiculo === 'Moto' ? '🏍️' : '🚲'}
                        </div>
                    `).join('')}
                </div>

                <div class="radar-legend">
                    <span>🟢 Repartidor Libre</span>
                    <span>🔴 Repartidor Ocupado</span>
                    <span>🏪 Local Comercial</span>
                </div>
            </div>

            <!-- COLUMNA DERECHA: DESPACHO RÁPIDO & FLOTA -->
            <div style="display:flex; flex-direction:column; gap:20px;">
                <!-- CARD DESPACHO RÁPIDO -->
                <div class="card card-accent-yellow">
                    <div class="card-header">
                        <h3>⚡ Despachar Pedido Óptimo</h3>
                    </div>
                    ${pedidosPendientes.length > 0 ? `
                        <div class="form-group">
                            <label>Seleccionar Pedido Pendiente:</label>
                            <select id="despacho-select-pedido" class="form-input" onchange="previewOptimoDespacho()">
                                ${pedidosPendientes.map(p => `
                                    <option value="${p.id}" data-x="${p.cliente_x}" data-y="${p.cliente_y}">
                                        Orden #${p.id} - Cliente en (${p.cliente_x}, ${p.cliente_y})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div id="preview-despacho-box" style="margin-bottom:14px; font-size:0.85rem; color:var(--text-secondary); background:var(--yellow-soft); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--yellow-sun);">
                            Calculando unidad más cercana...
                        </div>
                        <button class="btn btn-warning btn-block" onclick="ejecutarDespachoSeleccionado()">
                            🚀 Despachar al Repartidor Más Cercano
                        </button>
                    ` : `
                        <p style="color:var(--text-muted); font-size:0.9rem;">No hay pedidos pendientes de despacho en este momento.</p>
                    `}
                </div>

                <!-- CARD FLOTA -->
                <div class="card">
                    <div class="card-header">
                        <h3>👥 Estado de la Flota</h3>
                        <span class="badge" style="background:var(--blue-tint); color:var(--blue-primary); font-weight:700;">
                            ${cachedMotociclistas.length} repartidores
                        </span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto;">
                        ${cachedMotociclistas.map(m => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-app); border-radius:var(--radius-sm);">
                                <div>
                                    <strong style="color:var(--blue-navy);">${m.nombre}</strong> 
                                    <small style="color:var(--text-muted);">(${m.tipo_vehiculo} - ${m.placa_o_id})</small>
                                    <div style="font-size:0.75rem; color:var(--text-secondary);">Posición: (${m.coord_x}, ${m.coord_y})</div>
                                </div>
                                <span class="badge" style="background:${m.estado === 'Libre' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color:${m.estado === 'Libre' ? 'var(--success)' : 'var(--danger)'}; font-weight:800; font-size:0.75rem;">
                                    ${m.estado}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    previewOptimoDespacho();
}

window.previewOptimoDespacho = function() {
    const select = document.getElementById('despacho-select-pedido');
    const previewBox = document.getElementById('preview-despacho-box');
    if (!select || !previewBox) return;

    const opt = select.options[select.selectedIndex];
    if (!opt) return;

    const clienteX = parseFloat(opt.dataset.x);
    const clienteY = parseFloat(opt.dataset.y);

    const libres = cachedMotociclistas.filter(m => m.estado === 'Libre');
    if (libres.length === 0) {
        previewBox.innerHTML = '⚠️ <strong>Alerta:</strong> No hay repartidores disponibles en estado Libre.';
        return;
    }

    let masCercano = null;
    let minD = Infinity;

    libres.forEach(m => {
        const d = Math.sqrt(Math.pow(clienteX - m.coord_x, 2) + Math.pow(clienteY - m.coord_y, 2));
        if (d < minD) {
            minD = d;
            masCercano = m;
        }
    });

    if (masCercano) {
        previewBox.innerHTML = `
            <div>🎯 <strong>Unidad Óptima:</strong> ${masCercano.nombre} (${masCercano.tipo_vehiculo})</div>
            <div>📏 <strong>Distancia Euclidiana:</strong> ${minD.toFixed(2)} unidades</div>
        `;
    }
};

window.ejecutarDespachoSeleccionado = async () => {
    if (currentUser.rol !== 'admin') return;
    const select = document.getElementById('despacho-select-pedido');
    if (!select) return;
    const pedidoId = select.value;
    await despacharPedidoDirecto(pedidoId);
};

// ============================================================================
// 5. MÓDULO PROMOCIONES
// ============================================================================
async function renderPromociones(container) {
    let promociones = [];
    try {
        const res = await fetch(`${API_URL}/promociones`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
            const data = await res.json();
            promociones = data.data || [];
        }
    } catch (e) {
        console.warn('Usando promociones locales');
    }

    if (promociones.length === 0) {
        promociones = [
            { producto_nombre: 'Pancho Especial', local_nombre: 'Panchita', porcentaje_descuento: 15, fecha_expiracion: new Date(Date.now() + 3600000).toISOString() },
            { producto_nombre: 'Combo Familiar', local_nombre: 'Polloscoco', porcentaje_descuento: 10, fecha_expiracion: new Date(Date.now() + 7200000).toISOString() }
        ];
    }

    const isAdmin = currentUser.rol === 'admin';

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>🏷️ Promociones & Descuentos Activos</h2>
                <p>Ofertas relámpago con tiempo límite para entrega rápida</p>
            </div>
            <div class="view-actions">
                ${isAdmin ? `
                    <button class="btn btn-warning btn-sm" onclick="openModalNuevaPromo()">
                        ⚡ Nueva Promoción Flash
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="promos-grid">
            ${promociones.map(p => `
                <div class="promo-card card-lift">
                    <span class="promo-badge-tag">-${p.porcentaje_descuento}% OFF</span>
                    <div>
                        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:800; color:var(--yellow-dark); letter-spacing:1px;">
                            OFERTA EXCLUSIVA
                        </span>
                        <h3 style="font-size:1.35rem; color:var(--blue-navy); margin:6px 0 2px;">
                            ${p.producto_nombre}
                        </h3>
                        <p style="color:var(--text-secondary); font-size:0.9rem;">
                            🏢 Local: <strong>${p.local_nombre}</strong>
                        </p>
                    </div>

                    <div class="promo-timer-box">
                        <span>⏳</span>
                        <span>Expira: ${new Date(p.fecha_expiracion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================================================
// 6. MÓDULO GESTIÓN DE USUARIOS (Solo Admin)
// ============================================================================
async function renderUsuarios(container) {
    if (currentUser.rol !== 'admin') return;

    let usuarios = [];
    try {
        const res = await fetch(`${API_URL}/auth/usuarios`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
            const data = await res.json();
            usuarios = data.data || [];
            cachedUsuarios = usuarios;
        }
    } catch (e) {
        console.warn('Usando usuarios locales');
    }

    if (usuarios.length === 0) {
        usuarios = [
            { id: 1, nombre_usuario: 'admin', rol: 'admin', fecha_creacion: '2026-11-12 10:00:00' },
            { id: 2, nombre_usuario: 'user', rol: 'user', fecha_creacion: '2026-11-12 10:05:00' }
        ];
    }

    container.innerHTML = `
        <div class="view-header">
            <div class="view-title-group">
                <h2>👥 Gestión de Cuentas y Accesos</h2>
                <p>Administración y creación de usuarios con privilegios del sistema</p>
            </div>
            <div class="view-actions">
                <button class="btn btn-primary btn-sm" onclick="openModal('modal-admin-nuevo-usuario')">
                    ➕ Registrar Usuario
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>📋 Cuentas Registradas en el Sistema</h3>
                <span class="badge" style="background:var(--blue-tint); color:var(--blue-primary); font-weight:700;">
                    ${usuarios.length} usuarios
                </span>
            </div>

            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre de Usuario</th>
                            <th>Rol Asignado</th>
                            <th>Fecha de Registro</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(u => `
                            <tr>
                                <td><strong>#${u.id}</strong></td>
                                <td>👤 ${u.nombre_usuario}</td>
                                <td>
                                    <span class="tag-badge ${u.rol === 'admin' ? 'tag-despacho' : 'tag-pedido'}">
                                        ${u.rol.toUpperCase()}
                                    </span>
                                </td>
                                <td>${u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleString() : 'Reciente'}</td>
                                <td><span class="text-success">● Activo</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.handleAdminCrearUsuario = async function(e) {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo los administradores pueden crear usuarios desde el panel', 'error');
        return;
    }

    const nombre = document.getElementById('admin-user-nombre').value.trim();
    const rol = document.getElementById('admin-user-rol').value;
    const pass = document.getElementById('admin-user-pass').value.trim();

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: nombre, password: pass, rol: rol, is_admin_creation: true })
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('usuario', 'Usuario Creado por Admin', `El administrador creó la cuenta "${nombre}" (${rol}).`);
            showToast('Usuario creado correctamente', 'success');
            closeModal('modal-admin-nuevo-usuario');
            loadView('usuarios');
        } else {
            showToast(data.message || 'Error al crear usuario', 'error');
        }
    } catch (e) {
        logActivity('usuario', 'Usuario Creado por Admin (Local)', `Cuenta "${nombre}" agregada.`);
        showToast('Usuario registrado localmente', 'success');
        closeModal('modal-admin-nuevo-usuario');
        loadView('usuarios');
    }
};

// ============================================================================
// 7. MÓDULO REGISTRO DE ACTIVIDADES & AUDITORÍA (Solo Admin - Imprimible)
// ============================================================================
function initActivityLog() {
    if (!localStorage.getItem('fastmile_actividades')) {
        const iniciales = [
            { id: 1, fecha: new Date(Date.now() - 3600000).toLocaleString(), tipo: 'pedido', titulo: 'Pedido Registrado', detalle: 'Orden #101 creada para Pancho Clásico en (35, 45).', estado: 'Exitoso' },
            { id: 2, fecha: new Date(Date.now() - 3000000).toLocaleString(), tipo: 'despacho', titulo: 'Despacho Realizado', detalle: 'Orden #101 asignada a Manolo por distancia mínima euclidiana.', estado: 'En camino' },
            { id: 3, fecha: new Date(Date.now() - 1800000).toLocaleString(), tipo: 'entrega', titulo: 'Entrega Completada', detalle: 'Orden #101 completada. Repartidor liberado.', estado: 'Completado' },
            { id: 4, fecha: new Date(Date.now() - 900000).toLocaleString(), tipo: 'promo', titulo: 'Promoción Flash', detalle: 'Descuento 15% activado en Pancho Especial.', estado: 'Activo' },
            { id: 5, fecha: new Date().toLocaleString(), tipo: 'usuario', titulo: 'Acceso al Sistema', detalle: 'Sesión iniciada correctamente.', estado: 'Verificado' }
        ];
        localStorage.setItem('fastmile_actividades', JSON.stringify(iniciales));
    }
}

function logActivity(tipo, titulo, detalle, estado = 'Exitoso') {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('fastmile_actividades')) || [];
    } catch (e) {}

    const nuevo = {
        id: list.length + 1,
        fecha: new Date().toLocaleString(),
        tipo: tipo,
        titulo: titulo,
        detalle: detalle,
        estado: estado
    };
    list.unshift(nuevo);
    localStorage.setItem('fastmile_actividades', JSON.stringify(list.slice(0, 50)));
}

async function renderActividades(container) {
    // REGLA DE SEGURIDAD SOLICITADA: Solo Admin puede ver las actividades de la plataforma
    if (currentUser.rol !== 'admin') {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding:50px;">
                <div style="font-size:3rem; margin-bottom:12px;">🔒</div>
                <h2 style="color:var(--blue-navy);">Acceso Restringido</h2>
                <p style="color:var(--text-secondary); margin-top:8px;">La auditoría de actividades es confidencial y exclusiva para Administradores.</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="loadView('catalogo')">Ir al Catálogo</button>
            </div>
        `;
        return;
    }

    let actividades = [];
    try {
        actividades = JSON.parse(localStorage.getItem('fastmile_actividades')) || [];
    } catch (e) {}

    container.innerHTML = `
        <!-- CABECERA EXCLUSIVA PARA IMPRESIÓN (Visible en papel o PDF) -->
        <div class="print-only-header">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="print-title">🚀 FastMile Analytics - Sistema de Delivery</h1>
                    <p class="print-sub">Reporte Oficial de Actividades, Auditoría y Trazabilidad Operacional</p>
                </div>
                <div style="text-align:right; font-size:9pt;">
                    <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString()}</div>
                    <div><strong>Hora Emisión:</strong> ${new Date().toLocaleTimeString()}</div>
                    <div><strong>Generado por:</strong> ${currentUser?.nombre || 'Admin'} (ADMINISTRADOR)</div>
                </div>
            </div>
        </div>

        <div class="view-header">
            <div class="view-title-group">
                <h2>📜 Registro de Actividades & Auditoría</h2>
                <p>Historial cronológico de operaciones confidenciales para trazabilidad e impresión</p>
            </div>
            <div class="view-actions">
                <button class="btn btn-warning" onclick="imprimirReporteActividades()">
                    🖨️ Imprimir Reporte / Exportar PDF
                </button>
            </div>
        </div>

        <!-- RESUMEN EN TARJETAS -->
        <div class="kpi-grid" style="margin-bottom: 20px;">
            <div class="kpi-card kpi-blue">
                <div class="kpi-icon-box">📝</div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Registros</span>
                    <span class="kpi-val">${actividades.length}</span>
                    <span class="kpi-subtext">Eventos auditados</span>
                </div>
            </div>

            <div class="kpi-card kpi-yellow">
                <div class="kpi-icon-box">🏍️</div>
                <div class="kpi-info">
                    <span class="kpi-label">Despachos</span>
                    <span class="kpi-val">${actividades.filter(a => a.tipo === 'despacho' || a.tipo === 'entrega').length}</span>
                    <span class="kpi-subtext">Movimientos de flota</span>
                </div>
            </div>

            <div class="kpi-card kpi-green">
                <div class="kpi-icon-box">📦</div>
                <div class="kpi-info">
                    <span class="kpi-label">Pedidos Procesados</span>
                    <span class="kpi-val">${actividades.filter(a => a.tipo === 'pedido').length}</span>
                    <span class="kpi-subtext">Órdenes generadas</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>📑 Bitácora de Eventos Recientes</h3>
                <span class="badge" style="background:var(--yellow-light); color:var(--yellow-dark); font-weight:700;">
                    Documento Oficial Imprimible
                </span>
            </div>

            <div class="data-table-container">
                <table class="data-table" id="tabla-actividades-reporte">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha y Hora</th>
                            <th>Categoría</th>
                            <th>Operación</th>
                            <th>Detalle de la Actividad</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${actividades.map(a => `
                            <tr>
                                <td><strong>#${a.id}</strong></td>
                                <td>${a.fecha}</td>
                                <td>
                                    <span class="tag-badge tag-${a.tipo}">
                                        ${a.tipo.toUpperCase()}
                                    </span>
                                </td>
                                <td><strong>${a.titulo}</strong></td>
                                <td>${a.detalle}</td>
                                <td><span class="text-success">● ${a.estado}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- PIE DE FIRMAS PARA LA IMPRESIÓN -->
            <div class="print-footer-signatures hidden" id="print-signatures-box">
                <div class="sign-box">
                    Firma Responsable / Despachador
                </div>
                <div class="sign-box">
                    Sello de Auditoría y Control
                </div>
            </div>
        </div>
    `;
}

window.imprimirReporteActividades = function() {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo el Administrador puede imprimir la auditoría', 'error');
        return;
    }

    const signBox = document.getElementById('print-signatures-box');
    if (signBox) signBox.classList.remove('hidden');

    window.print();

    setTimeout(() => {
        if (signBox) signBox.classList.add('hidden');
    }, 1000);
};

// ============================================================================
// MODALES Y FORMULARIOS (Protección Estricta: Solo Admin puede Crear/Editar)
// ============================================================================
window.openModal = function(modalId) {
    // Si es un modal administrativo y el usuario es cliente, bloquearlo
    const modalesAdmin = ['modal-nuevo-local', 'modal-editar-local', 'modal-nuevo-producto', 'modal-editar-producto', 'modal-descuento', 'modal-nuevo-moto', 'modal-nueva-promo', 'modal-admin-nuevo-usuario'];
    if (modalesAdmin.includes(modalId) && currentUser.rol !== 'admin') {
        showToast('Acción no permitida: Requiere privilegios de Administrador', 'error');
        return;
    }

    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
};

window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
};

// Crear Local (Solo Admin)
window.handleCrearLocal = async (e) => {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden crear locales', 'error');
        return;
    }

    const body = {
        nombre: document.getElementById('modal-local-nombre').value.trim(),
        direccion: document.getElementById('modal-local-direccion').value.trim(),
        coord_x: parseFloat(document.getElementById('modal-local-x').value),
        coord_y: parseFloat(document.getElementById('modal-local-y').value)
    };

    try {
        const res = await fetch(`${API_URL}/locales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('local', 'Nuevo Local Comercial', `Se dio de alta el local "${body.nombre}" en (${body.coord_x}, ${body.coord_y}).`);
            showToast('Local creado exitosamente', 'success');
            closeModal('modal-nuevo-local');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al crear local', 'error');
        }
    } catch (err) {
        cachedLocales.push({ id: Date.now(), ...body, productos: [] });
        logActivity('local', 'Nuevo Local (Local)', `Local "${body.nombre}" creado.`);
        showToast('Local registrado con éxito', 'success');
        closeModal('modal-nuevo-local');
        loadView('catalogo');
    }
};

// Agregar Producto (Solo Admin)
window.openModalAgregarProducto = function() {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden agregar productos', 'error');
        return;
    }

    const select = document.getElementById('modal-prod-local-id');
    if (select) {
        select.innerHTML = cachedLocales.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
    }
    openModal('modal-nuevo-producto');
};

window.handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden agregar productos', 'error');
        return;
    }

    const localId = document.getElementById('modal-prod-local-id').value;
    const body = {
        nombre: document.getElementById('modal-prod-nombre').value.trim(),
        descripcion: document.getElementById('modal-prod-desc').value.trim(),
        precio: parseFloat(document.getElementById('modal-prod-precio').value)
    };

    try {
        const res = await fetch(`${API_URL}/locales/${localId}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('producto', 'Producto Agregado', `Producto "${body.nombre}" agregado al local #${localId} por Bs. ${body.precio}.`);
            showToast('Producto añadido al catálogo', 'success');
            closeModal('modal-nuevo-producto');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al agregar producto', 'error');
        }
    } catch (err) {
        const local = cachedLocales.find(l => l.id == localId);
        if (local) {
            local.productos = local.productos || [];
            local.productos.push({ id: Date.now(), ...body, nuevo_precio: body.precio, descuento_porcentaje: 0 });
        }
        logActivity('producto', 'Producto Agregado', `Producto "${body.nombre}" añadido.`);
        showToast('Producto añadido al catálogo', 'success');
        closeModal('modal-nuevo-producto');
        loadView('catalogo');
    }
};

// Aplicar Descuento (Solo Admin)
let descuentoPrecioOriginal = 0;
window.openModalDescuento = function(prodId, prodNombre, precioOriginal) {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden aplicar descuentos', 'error');
        return;
    }

    document.getElementById('modal-desc-prod-id').value = prodId;
    document.getElementById('modal-desc-prod-name').textContent = `Aplicar a: ${prodNombre} (Precio actual: Bs. ${precioOriginal})`;
    document.getElementById('modal-desc-porcentaje').value = 10;
    descuentoPrecioOriginal = precioOriginal;
    previewDescuento();
    openModal('modal-descuento');
};

window.previewDescuento = function() {
    const porc = parseFloat(document.getElementById('modal-desc-porcentaje').value) || 0;
    const nuevo = descuentoPrecioOriginal * (1 - (porc / 100));
    document.getElementById('preview-precio-val').textContent = `Bs. ${nuevo.toFixed(2)}`;
};

window.handleAplicarDescuento = async (e) => {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden aplicar descuentos', 'error');
        return;
    }

    const prodId = document.getElementById('modal-desc-prod-id').value;
    const porcentaje = parseInt(document.getElementById('modal-desc-porcentaje').value);

    try {
        const res = await fetch(`${API_URL}/productos/${prodId}/descuento`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ porcentaje })
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('promo', 'Descuento Aplicado', `Descuento del ${porcentaje}% aplicado al producto #${prodId}.`);
            showToast('Descuento aplicado exitosamente', 'success');
            closeModal('modal-descuento');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al aplicar descuento', 'error');
        }
    } catch (err) {
        logActivity('promo', 'Descuento Aplicado', `Descuento del ${porcentaje}% aplicado.`);
        showToast('Descuento aplicado', 'success');
        closeModal('modal-descuento');
        loadView('catalogo');
    }
};

// Registrar Motociclista (Solo Admin)
window.handleCrearMotociclista = async (e) => {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden registrar motociclistas', 'error');
        return;
    }

    const body = {
        nombre: document.getElementById('modal-moto-nombre').value.trim(),
        tipo_vehiculo: document.getElementById('modal-moto-tipo').value,
        placa_o_id: document.getElementById('modal-moto-placa').value.trim(),
        coord_x: parseFloat(document.getElementById('modal-moto-x').value),
        coord_y: parseFloat(document.getElementById('modal-moto-y').value)
    };

    try {
        const res = await fetch(`${API_URL}/motociclistas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('despacho', 'Nuevo Repartidor en Flota', `Repartidor ${body.nombre} (${body.tipo_vehiculo}) registrado.`);
            showToast('Repartidor registrado en la flota', 'success');
            closeModal('modal-nuevo-moto');
            loadView('despacho');
        } else {
            showToast(data.message || 'Error al registrar repartidor', 'error');
        }
    } catch (err) {
        cachedMotociclistas.push({ id: Date.now(), ...body, estado: 'Libre' });
        logActivity('despacho', 'Nuevo Repartidor Registrado', `Repartidor ${body.nombre} registrado.`);
        showToast('Repartidor registrado con éxito', 'success');
        closeModal('modal-nuevo-moto');
        loadView('despacho');
    }
};

// Crear Promoción (Solo Admin)
window.openModalNuevaPromo = function() {
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden crear promociones', 'error');
        return;
    }

    const selectLocal = document.getElementById('modal-promo-local-id');
    if (selectLocal && cachedLocales.length > 0) {
        selectLocal.innerHTML = cachedLocales.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
        actualizarProductosPromo();
    }
    openModal('modal-nueva-promo');
};

window.actualizarProductosPromo = function() {
    const localId = parseInt(document.getElementById('modal-promo-local-id')?.value);
    const selectProd = document.getElementById('modal-promo-prod-id');
    if (!selectProd) return;

    const local = cachedLocales.find(l => l.id === localId);
    if (local && local.productos && local.productos.length > 0) {
        selectProd.innerHTML = local.productos.map(p => `<option value="${p.id}">${p.nombre} (Bs. ${p.precio})</option>`).join('');
    } else {
        selectProd.innerHTML = '<option value="">No hay productos</option>';
    }
};

window.handleCrearPromocion = async (e) => {
    e.preventDefault();
    if (currentUser.rol !== 'admin') {
        showToast('Acción denegada: Solo administradores pueden crear promociones', 'error');
        return;
    }

    const body = {
        local_id: parseInt(document.getElementById('modal-promo-local-id').value),
        producto_id: parseInt(document.getElementById('modal-promo-prod-id').value),
        porcentaje_descuento: parseInt(document.getElementById('modal-promo-porcentaje').value),
        duracion_minutos: parseInt(document.getElementById('modal-promo-duracion').value)
    };

    try {
        const res = await fetch(`${API_URL}/promociones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            logActivity('promo', 'Nueva Promoción Flash', `Promoción de ${body.porcentaje_descuento}% por ${body.duracion_minutos} min activada.`);
            showToast('¡Promoción activada exitosamente!', 'success');
            closeModal('modal-nueva-promo');
            loadView('promociones');
        } else {
            showToast(data.message || 'Error al crear promoción', 'error');
        }
    } catch (err) {
        logActivity('promo', 'Promoción Flash Activada', `Promoción del ${body.porcentaje_descuento}% activada.`);
        showToast('Promoción activada exitosamente', 'success');
        closeModal('modal-nueva-promo');
        loadView('promociones');
    }
};

// ============================================================================
// MOBILE SIDEBAR TOGGLE
// ============================================================================
function setupMobileSidebar() {
    const toggleBtn = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', closeMobileSidebar);
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');
}
