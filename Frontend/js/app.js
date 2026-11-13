// Frontend/js/app.js
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let charts = {}; // Para guardar instancias de Chart.js y destruirlas

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('usuario');
    const storedRol = localStorage.getItem('rol');
    if (storedUser && storedRol) {
        currentUser = { nombre: storedUser, rol: storedRol };
        showApp();
    }
});

// --- AUTH ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: user, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.data;
            localStorage.setItem('usuario', data.data.nombre_usuario);
            localStorage.setItem('rol', data.data.rol);
            showApp();
        } else {
            document.getElementById('login-error').textContent = data.message;
        }
    } catch (err) { document.getElementById('login-error').textContent = 'Error de conexión'; }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear(); location.reload();
});

function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('user-display').textContent = `👤 ${currentUser.nombre} (${currentUser.rol})`;
    
    // Navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => loadView(e.target.dataset.view));
    });
    loadView('dashboard'); // Vista por defecto
}

async function loadView(viewName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
    const content = document.getElementById('content-area');
    content.innerHTML = '<p>Cargando...</p>';

    // Ocultar vistas admin si es user
    if (currentUser.rol === 'user' && ['dashboard', 'despacho', 'promociones'].includes(viewName)) {
        content.innerHTML = '<h2>Acceso restringido</h2>'; return;
    }

    if (viewName === 'dashboard') await renderDashboard(content);
    else if (viewName === 'catalogo') await renderCatalogo(content);
    else if (viewName === 'pedidos') await renderPedidos(content);
    else if (viewName === 'despacho') await renderDespacho(content);
    else if (viewName === 'promociones') await renderPromociones(content);
}

// --- VISTAS ---

// 1. DASHBOARD
async function renderDashboard(container) {
    container.innerHTML = `
        <h2>📊 Dashboard Analítico</h2>
        <div class="charts-grid">
            <div class="chart-box"><canvas id="chartPedidos"></canvas></div>
            <div class="chart-box"><canvas id="chartMotos"></canvas></div>
        </div>
        <div class="chart-box"><canvas id="chartTendencia"></canvas></div>
    `;
    const data = await (await fetch(`${API_URL}/reportes/dashboard`)).json();
    
    // Destruir charts anteriores si existen
    Object.values(charts).forEach(c => c.destroy());

    charts.pedidos = new Chart(document.getElementById('chartPedidos'), {
        type: 'bar', data: { labels: data.data.pedidos.map(p=>p.estado), datasets: [{ label: 'Pedidos', data: data.data.pedidos.map(p=>p.total), backgroundColor: '#007acc' }] }
    });
    charts.motos = new Chart(document.getElementById('chartMotos'), {
        type: 'doughnut', data: { labels: data.data.motociclistas.map(m=>m.estado), datasets: [{ data: data.data.motociclistas.map(m=>m.total), backgroundColor: ['#4caf50', '#f44336'] }] }
    });
    charts.tendencia = new Chart(document.getElementById('chartTendencia'), {
        type: 'line', data: { labels: data.data.tendencia_horaria.map(t=>t.bloque_horario), datasets: [{ label: 'Demanda', data: data.data.tendencia_horaria.map(t=>t.total), borderColor: '#007acc', fill: false }] }
    });
}

// 2. CATALOGO
async function renderCatalogo(container) {
    const res = await fetch(`${API_URL}/locales?rol=${currentUser.rol}`);
    const data = await res.json();
    let html = '<h2>🏪 Catálogo</h2><div class="grid">';
    data.data.forEach(local => {
        html += `<div class="card"><h3>${local.nombre}</h3><p>${local.direccion}</p><hr style="margin:10px 0; border-color:#333">`;
        local.productos.forEach(p => {
            html += `<div class="product-item"><span>${p.nombre} ${p.descuento_porcentaje > 0 ? `<span class="badge badge-danger">-${p.descuento_porcentaje}%</span>` : ''}</span><span style="color:#4caf50">$${p.nuevo_precio}</span></div>`;
        });
        html += `</div>`;
    });
    container.innerHTML = html + '</div>';
}

// 3. PEDIDOS
async function renderPedidos(container) {
    container.innerHTML = `
        <h2>📦 Gestión de Pedidos</h2>
        <div class="card" style="margin-bottom:20px">
            <h3>Cotizador de Tarifa</h3>
            <div class="form-group"><label>Distancia (km)</label><input type="number" id="distancia" step="0.1"></div>
            <button class="btn" onclick="calcularTarifa()">Calcular</button>
            <p id="tarifa-result" style="margin-top:10px; font-weight:bold"></p>
        </div>
        <div class="card">
            <h3>Crear Pedido</h3>
            <div class="form-group"><label>Local ID</label><input type="number" id="p-local"></div>
            <div class="form-group"><label>Producto ID</label><input type="number" id="p-prod"></div>
            <div class="form-group"><label>Cliente X (0-100)</label><input type="number" id="p-x"></div>
            <div class="form-group"><label>Cliente Y (0-100)</label><input type="number" id="p-y"></div>
            <button class="btn" onclick="crearPedido()">Crear Pedido</button>
        </div>
    `;
}
window.calcularTarifa = async () => {
    const dist = document.getElementById('distancia').value;
    const res = await fetch(`${API_URL}/pedidos/calcular-tarifa`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({distancia_km: parseFloat(dist)}) });
    const data = await res.json();
    document.getElementById('tarifa-result').textContent = `Total envío: $${data.data.total_envio}`;
};
window.crearPedido = async () => {
    const body = {
        local_id: parseInt(document.getElementById('p-local').value),
        producto_id: parseInt(document.getElementById('p-prod').value),
        cliente_x: parseFloat(document.getElementById('p-x').value),
        cliente_y: parseFloat(document.getElementById('p-y').value)
    };
    const res = await fetch(`${API_URL}/pedidos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    alert(data.message);
};

// 4. DESPACHO
async function renderDespacho(container) {
    const res = await fetch(`${API_URL}/motociclistas`);
    const data = await res.json();
    let html = `<h2>🏍️ Mapa de Despacho (0-100)</h2><div class="map-container" id="mapa">`;
    data.data.forEach(m => {
        html += `<div class="map-point ${m.estado === 'Libre' ? 'point-libre' : 'point-ocupado'}" style="left:${m.coord_x}%; top:${m.coord_y}%" title="${m.nombre} (${m.estado})"></div>`;
    });
    html += `</div><p style="margin-top:10px">🟢 Libre | 🔴 Ocupado</p>`;
    container.innerHTML = html;
}

// 5. PROMOCIONES
async function renderPromociones(container) {
    const res = await fetch(`${API_URL}/promociones`);
    const data = await res.json();
    let html = '<h2>🏷️ Promociones Activas</h2><div class="grid">';
    if(data.data.length === 0) html += '<p>No hay promociones activas.</p>';
    data.data.forEach(p => {
        html += `<div class="card"><h3>${p.producto_nombre}</h3><p>Local: ${p.local_nombre}</p><p class="badge badge-danger" style="font-size:1.2rem; margin:10px 0">-${p.porcentaje_descuento}%</p><p>Expira: ${new Date(p.fecha_expiracion).toLocaleTimeString()}</p></div>`;
    });
    container.innerHTML = html + '</div>';
}