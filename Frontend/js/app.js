// ============================================================================
// FastMile Analytics - Sistema de Delivery & Logística
// Interfaz Moderna, Paleta Azul-Amarillo-Blanco, Cards Profesionales & Responsive
// ============================================================================

// --- Configuración Global de la API ---
let API_URL = localStorage.getItem('fastmile_api_url') || 'http://localhost:3000/api';
let currentUser = null;
let charts = {};
let cachedLocales = [];
let cachedMotociclistas = [];
let cachedPedidos = [];

// --- Inicialización al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
    updateApiLabel();
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
    }, 3800);
}

// ============================================================================
// CONFIGURACIÓN DE RED Y API (Multi-VM)
// ============================================================================
function updateApiLabel() {
    const label = document.getElementById('api-endpoint-label');
    const cleanUrl = API_URL.replace('http://', '').replace('/api', '');
    if (label) label.textContent = `API: ${cleanUrl}`;
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
        updateApiLabel();
        closeModal('modal-api-config');
        showToast('Dirección de API actualizada: ' + API_URL, 'success');
        checkApiHealth();
    }
};

async function checkApiHealth() {
    const indicator = document.getElementById('api-status-indicator');
    const dot = indicator?.querySelector('.status-dot');
    try {
        const rootUrl = API_URL.replace('/api', '');
        const res = await fetch(`${rootUrl}/health`, { signal: AbortSignal.timeout(2500) });
        if (res.ok && dot) {
            dot.className = 'status-dot online';
            indicator.title = 'Backend conectado exitosamente';
        } else if (dot) {
            dot.className = 'status-dot offline';
            indicator.title = 'Respuesta inesperada del servidor';
        }
    } catch (e) {
        if (dot) {
            dot.className = 'status-dot offline';
            indicator.title = 'No se pudo contactar al Backend. Verifica IP/puerto.';
        }
    }
}

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

            showToast(`¡Bienvenido, ${currentUser.nombre}!`, 'success');
            showApp();
        } else {
            errorEl.textContent = data.message || 'Credenciales inválidas.';
            errorEl.classList.remove('hidden');
            showToast(data.message || 'Error en las credenciales', 'error');
        }
    } catch (err) {
        errorEl.textContent = `Error de conexión con ${API_URL}. Revisa que el backend esté ejecutándose.`;
        errorEl.classList.remove('hidden');
        showToast('No se pudo conectar al servidor Backend', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Iniciar Sesión</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('fastmile_usuario');
    localStorage.removeItem('fastmile_rol');
    localStorage.removeItem('fastmile_id');
    currentUser = null;
    showToast('Sesión cerrada correctamente', 'info');
    showLogin();
});

function showLogin() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
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

    if (roleBadge) {
        roleBadge.textContent = currentUser.rol.toUpperCase();
        roleBadge.className = currentUser.rol === 'admin' ? 'role-pill role-admin' : 'role-pill role-user';
    }

    // Adaptar navegación según rol
    const adminBadges = document.querySelectorAll('.nav-badge.admin-only');
    const navDashboard = document.getElementById('nav-btn-dashboard');
    const navDespacho = document.getElementById('nav-btn-despacho');

    if (currentUser.rol === 'user') {
        if (navDashboard) navDashboard.style.display = 'none';
        if (navDespacho) navDespacho.style.display = 'none';
        adminBadges.forEach(b => b.style.display = 'none');
        loadView('catalogo');
    } else {
        if (navDashboard) navDashboard.style.display = 'flex';
        if (navDespacho) navDespacho.style.display = 'flex';
        adminBadges.forEach(b => b.style.display = 'inline-block');
        loadView('dashboard');
    }

    // Eventos en botones de navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = (e) => {
            const targetBtn = e.currentTarget;
            const viewName = targetBtn.dataset.view;
            loadView(viewName);
            closeMobileSidebar();
        };
    });

    checkApiHealth();
}

// ============================================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================================
async function loadView(viewName) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:300px; flex-direction:column; gap:16px;">
            <div style="width:48px; height:48px; border:4px solid #dbeafe; border-top-color:#1d4ed8; border-radius:50%; animation:spin 1s linear infinite;"></div>
            <p style="color:#64748b; font-weight:600;">Cargando datos de FastMile...</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    // Protección de acceso
    if (currentUser.rol === 'user' && ['dashboard', 'despacho'].includes(viewName)) {
        content.innerHTML = `
            <div class="card" style="text-align:center; padding:50px;">
                <div style="font-size:3rem; margin-bottom:12px;">🔒</div>
                <h2 style="color:var(--blue-navy);">Acceso Restringido a Administradores</h2>
                <p style="color:var(--text-secondary); margin-top:8px;">Este módulo solo está disponible para usuarios con privilegios de administrador.</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="loadView('catalogo')">Volver al Catálogo</button>
            </div>
        `;
        return;
    }

    try {
        if (viewName === 'dashboard') await renderDashboard(content);
        else if (viewName === 'catalogo') await renderCatalogo(content);
        else if (viewName === 'pedidos') await renderPedidos(content);
        else if (viewName === 'despacho') await renderDespacho(content);
        else if (viewName === 'promociones') await renderPromociones(content);
    } catch (err) {
        content.innerHTML = `
            <div class="card" style="padding:40px; text-align:center;">
                <div style="font-size:3rem; margin-bottom:12px;">⚠️</div>
                <h3 style="color:var(--danger);">Error al cargar el módulo</h3>
                <p style="color:var(--text-secondary); margin:12px 0;">No se pudo conectar con la API en <code>${API_URL}</code>.</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button class="btn btn-secondary" onclick="openApiConfigModal()">⚙️ Configurar IP VM</button>
                    <button class="btn btn-primary" onclick="loadView('${viewName}')">🔄 Reintentar</button>
                </div>
            </div>
        `;
    }
}

// ============================================================================
// 1. MÓDULO DASHBOARD ANALÍTICO (Admin)
// ============================================================================
async function renderDashboard(container) {
    let dashboardData = {
        pedidos: [{ estado: 'Pendiente', total: 0 }, { estado: 'Completado', total: 0 }],
        motociclistas: [{ estado: 'Libre', total: 3 }, { estado: 'Ocupado', total: 0 }],
        tendencia_horaria: [
            { bloque_horario: '00:00', total: 2 },
            { bloque_horario: '06:00', total: 5 },
            { bloque_horario: '12:00', total: 18 },
            { bloque_horario: '18:00', total: 24 }
        ]
    };

    try {
        const res = await fetch(`${API_URL}/reportes/dashboard`);
        if (res.ok) {
            const apiRes = await res.json();
            if (apiRes.data) dashboardData = apiRes.data;
        }
    } catch (e) {
        console.warn('Dashboard usando datos en cache:', e);
    }

    // Calcular KPIs
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

        <!-- GRÁFICOS CHART.JS CON PALETA AZUL Y AMARILLO -->
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

    // Destruir gráficos anteriores
    Object.values(charts).forEach(c => { if (c) c.destroy(); });

    // 1. Gráfico de Pedidos (Barras Azul & Amarillo)
    const ctxPedidos = document.getElementById('chartPedidos')?.getContext('2d');
    if (ctxPedidos) {
        charts.pedidos = new Chart(ctxPedidos, {
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
    }

    // 2. Gráfico de Motociclistas (Donut)
    const ctxMotos = document.getElementById('chartMotos')?.getContext('2d');
    if (ctxMotos) {
        charts.motos = new Chart(ctxMotos, {
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
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // 3. Gráfico de Líneas (Curva suave Azul con puntos Amarillos)
    const ctxTendencia = document.getElementById('chartTendencia')?.getContext('2d');
    if (ctxTendencia) {
        charts.tendencia = new Chart(ctxTendencia, {
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
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                    x: { grid: { color: '#e2e8f0' } }
                }
            }
        });
    }
}

// ============================================================================
// 2. MÓDULO CATÁLOGO & LOCALES
// ============================================================================
async function renderCatalogo(container) {
    const res = await fetch(`${API_URL}/locales?rol=${currentUser.rol}`);
    const data = await res.json();
    cachedLocales = data.data || [];

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
                <span id="locales-count-label">${cachedLocales.length}</span> locales registrados
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
                            ${p.descuento_porcentaje > 0 ? `<span class="price-original">$${Number(p.precio).toFixed(2)}</span>` : ''}
                            <span class="price-current">$${Number(p.nuevo_precio).toFixed(2)}</span>
                            
                            <div style="display:flex; gap:6px; margin-top:4px;">
                                <button class="btn btn-warning btn-sm" style="padding:3px 8px; font-size:0.75rem;" onclick="pedirProductoDirecto(${local.id || 1}, ${p.id || 1}, '${p.nombre}')">
                                    🛒 Pedir
                                </button>
                                ${isAdmin ? `
                                    <button class="btn btn-secondary btn-sm" style="padding:3px 6px; font-size:0.72rem;" onclick="openModalDescuento(${p.id}, '${p.nombre}', ${p.precio})">
                                        🏷️ %
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
            showToast(`Seleccionado: ${prodNombre} para tu orden`, 'info');
        }, 300);
    });
};

// ============================================================================
// 3. MÓDULO PEDIDOS & COTIZADOR
// ============================================================================
async function renderPedidos(container) {
    // Cargar locales para selectores
    if (cachedLocales.length === 0) {
        try {
            const resLocales = await fetch(`${API_URL}/locales?rol=${currentUser.rol}`);
            const dataLocales = await resLocales.json();
            cachedLocales = dataLocales.data || [];
        } catch (e) {}
    }

    // Cargar pedidos actuales
    let pedidos = [];
    try {
        const res = await fetch(`${API_URL}/pedidos`);
        const data = await res.json();
        pedidos = data.data || [];
        cachedPedidos = pedidos;
    } catch (e) {
        console.warn('Error cargando pedidos:', e);
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
                    Fórmula oficial: <strong>Tarifa Base ($2.50) + ($1.25 / km)</strong>
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
                        <span>Base: $2.50 | Costo/km: $1.25</span>
                        <span id="tarifa-breakdown-dist">Distancia: 5.0 km</span>
                    </div>
                    <div class="calc-total-pill" id="tarifa-total-display">$8.75</div>
                </div>
            </div>

            <!-- CARD 2: CREACIÓN DE PEDIDO -->
            <div class="card card-accent-blue">
                <div class="card-header">
                    <h3>🛍️ Crear Nueva Orden</h3>
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
                <h3>📋 Órdenes Recientes en el Sistema</h3>
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
                    ${p.motociclista_id ? `<div>🏍️ Repartidor ID: <strong>#${p.motociclista_id}</strong></div>` : ''}
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:10px;">
                    ${(isAdmin && p.estado === 'Pendiente') ? `
                        <button class="btn btn-warning btn-sm" onclick="despacharPedidoDirecto(${p.id})">
                            🏍️ Despachar Unidad
                        </button>
                    ` : ''}
                    ${(p.estado === 'En camino') ? `
                        <button class="btn btn-primary btn-sm" onclick="completarPedidoDirecto(${p.id})">
                            ✅ Finalizar Entrega
                        </button>
                    ` : ''}
                </div>
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
    totalEl.textContent = `$${total.toFixed(2)}`;
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
            document.getElementById('tarifa-total-display').textContent = `$${data.data.total_envio.toFixed(2)}`;
            showToast(`Tarifa calculada: $${data.data.total_envio.toFixed(2)}`, 'success');
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
            showToast('¡Pedido creado exitosamente con estado Pendiente!', 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'Error al crear el pedido', 'error');
        }
    } catch (err) {
        showToast('Error de conexión al crear pedido', 'error');
    }
};

window.despacharPedidoDirecto = async (pedidoId) => {
    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/despachar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`¡Despachado! Repartidor asignado: ${data.data.motociclista_asignado}`, 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'No se pudo despachar el pedido', 'error');
        }
    } catch (e) {
        showToast('Error de red al despachar pedido', 'error');
    }
};

window.completarPedidoDirecto = async (pedidoId) => {
    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/completar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('¡Entrega completada! Repartidor liberado en nueva posición.', 'success');
            loadView('pedidos');
        } else {
            showToast(data.message || 'Error al completar pedido', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

// ============================================================================
// 4. MÓDULO DESPACHO & FLOTA CARTESIANA (0-100)
// ============================================================================
async function renderDespacho(container) {
    const resMotos = await fetch(`${API_URL}/motociclistas`);
    const dataMotos = await resMotos.json();
    cachedMotociclistas = dataMotos.data || [];

    // Cargar también pedidos pendientes para el despacho rápido
    let pedidosPendientes = [];
    try {
        const resPed = await fetch(`${API_URL}/pedidos`);
        const dataPed = await resPed.json();
        pedidosPendientes = (dataPed.data || []).filter(p => p.estado === 'Pendiente');
    } catch (e) {}

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
    const select = document.getElementById('despacho-select-pedido');
    if (!select) return;
    const pedidoId = select.value;
    await despacharPedidoDirecto(pedidoId);
};

// ============================================================================
// 5. MÓDULO PROMOCIONES
// ============================================================================
async function renderPromociones(container) {
    const res = await fetch(`${API_URL}/promociones`);
    const data = await res.json();
    const promociones = data.data || [];

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
            ${promociones.length > 0 ? promociones.map(p => `
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
            `).join('') : `
                <div class="card" style="grid-column: 1 / -1; text-align:center; padding:40px;">
                    <p style="color:var(--text-muted); font-size:1.1rem;">No hay promociones activas en este momento.</p>
                </div>
            `}
        </div>
    `;
}

// ============================================================================
// MODALES Y MANEJO DE FORMULARIOS ADMIN
// ============================================================================
window.openModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
};

window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
};

// Crear Local
window.handleCrearLocal = async (e) => {
    e.preventDefault();
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
            showToast('Local creado exitosamente', 'success');
            closeModal('modal-nuevo-local');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al crear local', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// Agregar Producto
window.openModalAgregarProducto = function() {
    const select = document.getElementById('modal-prod-local-id');
    if (select) {
        select.innerHTML = cachedLocales.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
    }
    openModal('modal-nuevo-producto');
};

window.handleAgregarProducto = async (e) => {
    e.preventDefault();
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
            showToast('Producto añadido al catálogo', 'success');
            closeModal('modal-nuevo-producto');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al agregar producto', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// Aplicar Descuento
let descuentoPrecioOriginal = 0;
window.openModalDescuento = function(prodId, prodNombre, precioOriginal) {
    document.getElementById('modal-desc-prod-id').value = prodId;
    document.getElementById('modal-desc-prod-name').textContent = `Aplicar a: ${prodNombre} (Precio actual: $${precioOriginal})`;
    document.getElementById('modal-desc-porcentaje').value = 10;
    descuentoPrecioOriginal = precioOriginal;
    previewDescuento();
    openModal('modal-descuento');
};

window.previewDescuento = function() {
    const porc = parseFloat(document.getElementById('modal-desc-porcentaje').value) || 0;
    const nuevo = descuentoPrecioOriginal * (1 - (porc / 100));
    document.getElementById('preview-precio-val').textContent = `$${nuevo.toFixed(2)}`;
};

window.handleAplicarDescuento = async (e) => {
    e.preventDefault();
    const prodId = document.getElementById('modal-desc-prod-id').value;
    const porcentaje = parseInt(document.getElementById('modal-desc-porcentaje').value);

    try {
        const res = await fetch(`${API_URL}/locales/productos/${prodId}/descuento`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ porcentaje })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Descuento aplicado exitosamente', 'success');
            closeModal('modal-descuento');
            loadView('catalogo');
        } else {
            showToast(data.message || 'Error al aplicar descuento', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// Registrar Motociclista
window.handleCrearMotociclista = async (e) => {
    e.preventDefault();
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
            showToast('Repartidor registrado en la flota', 'success');
            closeModal('modal-nuevo-moto');
            loadView('despacho');
        } else {
            showToast(data.message || 'Error al registrar repartidor', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// Crear Promoción
window.openModalNuevaPromo = function() {
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
        selectProd.innerHTML = local.productos.map(p => `<option value="${p.id}">${p.nombre} ($${p.precio})</option>`).join('');
    } else {
        selectProd.innerHTML = '<option value="">No hay productos</option>';
    }
};

window.handleCrearPromocion = async (e) => {
    e.preventDefault();
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
            showToast('¡Promoción activada exitosamente!', 'success');
            closeModal('modal-nueva-promo');
            loadView('promociones');
        } else {
            showToast(data.message || 'Error al crear promoción', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
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
