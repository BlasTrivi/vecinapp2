// auth.js
import { state, uuid, getCurrentUser, getCurrentCommerce } from './state.js';
import { saveData, saveCurrentUserId, saveCurrentCommerceId } from './storage.js';
import { renderUserView, renderCommerceView, renderProfileView, renderCommerceStatsView } from './views.js';
import { renderCommerceLogin } from './views.js';

export function addLogout(container) {
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Cerrar sesión';
  btn.addEventListener('click', () => {
    state.sessionRole = null;
    state.currentUserId = null;
    state.currentCommerceId = null;
    saveCurrentUserId();
    saveCurrentCommerceId();
    renderApp();
  });
  container.appendChild(btn);
}

export function renderAuthView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form';
  wrapper.innerHTML = `
    <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
      <button type="button" id="tab-register" class="btn primary">Registro</button>
      <button type="button" id="tab-login" class="btn">Login</button>
    </div>
    <div id="auth-content"></div>
  `;
  container.appendChild(wrapper);

  const tabRegister = wrapper.querySelector('#tab-register');
  const tabLogin = wrapper.querySelector('#tab-login');
  const content = wrapper.querySelector('#auth-content');

  function setActive(tab) {
    if (tab === 'register') {
      tabRegister.classList.add('primary');
      tabLogin.classList.remove('primary');
      renderRegister();
    } else {
      tabLogin.classList.add('primary');
      tabRegister.classList.remove('primary');
      renderLogin();
    }
  }

  tabRegister.addEventListener('click', () => setActive('register'));
  tabLogin.addEventListener('click', () => setActive('login'));

  function renderRegister() {
    content.innerHTML = `
      <h2>Registro</h2>
      <p class="muted">Elegí tu rol y completa los datos. (Demo: contraseñas sin cifrado)</p>
      <form id="register-form">
        <label>Rol
          <select name="role" required>
            <option value="user">Vecino / Cliente</option>
            <option value="commerce">Comercio</option>
          </select>
        </label>
        <div id="role-fields"></div>
        <label style="margin-top:0.5rem;">
          <input type="checkbox" name="terms" required /> Acepto términos y condiciones
        </label>
        <div class="form-actions">
          <button type="submit" class="btn primary">Registrarme</button>
        </div>
      </form>
    `;
    const form = content.querySelector('#register-form');
    const roleFields = form.querySelector('#role-fields');
    function renderRoleSpecific(role) {
      if (role === 'user') {
        roleFields.innerHTML = `
          <label>Nombre
            <input name="name" required />
          </label>
          <label>Email
            <input type="email" name="email" required />
          </label>
          <label>Contraseña
            <input type="password" name="password" required minlength="4" />
          </label>
        `;
      } else {
        roleFields.innerHTML = `
          <label>Nombre del comercio
            <input name="commerceName" required />
          </label>
          <label>Rubro
            <input name="category" placeholder="Ej: Gastronomía" required />
          </label>
          <label>Email
            <input type="email" name="email" required />
          </label>
          <label>Contraseña
            <input type="password" name="password" required minlength="4" />
          </label>
          <label>Ubicación (barrio o dirección de referencia)
            <input name="location" placeholder="Barrio o dirección" />
          </label>
          <div id="reg-map" style="height:300px;border:1px solid #ddd;border-radius:0.5rem;margin:0.5rem 0;"></div>
          <div class="form-row" style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
            <input name="lat" placeholder="Lat" style="width:8rem" required />
            <input name="lng" placeholder="Lng" style="width:8rem" required />
            <button type="button" class="btn" id="btn-reg-use-pos">Usar mi ubicación</button>
            <span class="muted" style="font-size:0.75rem;">Consejo: hacé clic en el mapa para colocar el pin.</span>
          </div>
        `;
        setTimeout(initRegisterCommerceMap, 0);
      }
    }
    form.elements['role'].addEventListener('change', e => renderRoleSpecific(e.target.value));
    renderRoleSpecific(form.elements['role'].value);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const role = fd.get('role');
      const terms = fd.get('terms');
      if (!terms) return;
      if (role === 'user') {
        const name = (fd.get('name')||'').toString().trim();
        const email = (fd.get('email')||'').toString().trim().toLowerCase();
        const password = (fd.get('password')||'').toString();
        if (!name || !email || !password) return;
        const existsUser = state.data.users.some(u=>u.email===email);
        const existsCommerce = state.data.commerces.some(c=>c.email===email);
        if (existsUser || existsCommerce) { alert('Ese email ya está en uso (vecino o comercio).'); return; }
        const newUser = { id: uuid('user'), name, email, password, acceptedTerms:true, createdAt:new Date().toISOString() };
        state.data.users.push(newUser); saveData(); state.currentUserId=newUser.id; saveCurrentUserId(); state.sessionRole='user'; renderApp();
      } else {
        const commerceName = (fd.get('commerceName')||'').toString().trim();
        const category = (fd.get('category')||'').toString().trim();
        const email = (fd.get('email')||'').toString().trim().toLowerCase();
        const password = (fd.get('password')||'').toString();
        const location = (fd.get('location')||'').toString().trim();
        const latStr = (fd.get('lat')||'').toString().trim();
        const lngStr = (fd.get('lng')||'').toString().trim();
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!commerceName || !email || !password) return;
        const existsCommerce = state.data.commerces.some(c=>c.email===email);
        const existsUser = state.data.users.some(u=>u.email===email);
        if (existsCommerce || existsUser) { alert('Ese email ya está en uso (vecino o comercio).'); return; }
        if (!isFinite(lat) || !isFinite(lng)) { alert('Seleccioná la ubicación en el mapa o usá "Usar mi ubicación".'); return; }
        const newCommerce = { id: uuid('com'), name: commerceName, category, email, password, address: location, neighborhood: location, lat, lng, acceptedTerms:true, createdAt:new Date().toISOString() };
        state.data.commerces.push(newCommerce); saveData(); state.currentCommerceId=newCommerce.id; saveCurrentCommerceId(); state.sessionRole='commerce'; renderApp();
      }
    });
  }

  function renderLogin() {
    content.innerHTML = `
      <h2>Login</h2>
      <p class="muted">Ingresá tu email y contraseña. El rol se detecta automáticamente.</p>
      <form id="login-form">
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Contraseña
          <input type="password" name="password" required minlength="4" />
        </label>
        <div class="form-actions">
          <button type="submit" class="btn primary">Entrar</button>
        </div>
      </form>
      <p class="muted" style="margin-top:0.75rem; font-size:0.75rem;">Demo sin cifrado ni recuperación de contraseña.</p>
    `;
    const form = content.querySelector('#login-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = (fd.get('email')||'').toString().trim().toLowerCase();
      const password = (fd.get('password')||'').toString();
      if (!email || !password) return;
      const user = state.data.users.find(u=>u.email===email && u.password===password);
      const commerce = state.data.commerces.find(c=>c.email===email && c.password===password);
      if (user && commerce) {
        alert('Conflicto: el email existe en ambos roles. Limpia datos manualmente.');
        return;
      }
      if (user) {
        state.currentUserId = user.id; saveCurrentUserId(); state.sessionRole='user'; renderApp();
        return;
      }
      if (commerce) {
        state.currentCommerceId = commerce.id; saveCurrentCommerceId(); state.sessionRole='commerce'; renderApp();
        return;
      }
      alert('Credenciales incorrectas.');
    });
  }

  setActive('register');
}

// Mapa para registro de comercio
function initRegisterCommerceMap() {
  const mapEl = document.getElementById('reg-map');
  const form = document.getElementById('register-form');
  if (!mapEl || !form) return;
  // Asegurar Leaflet cargado (por si el CDN tardó o falló)
  if (!window.L) {
    ensureLeafletAssets(() => setTimeout(initRegisterCommerceMap, 100));
    return;
  }
  // Reset posible mapa previo
  if (mapEl._leaflet_id) {
    try { mapEl._leaflet_id = null; } catch(_) {}
  }
  const latInput = form.elements['lat'];
  const lngInput = form.elements['lng'];
  const map = L.map(mapEl).setView([ -32.95, -60.66 ], 12); // Ej: Rosario por defecto
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  let marker = null;
  function setMarker(lat,lng) {
    if (marker) { marker.setLatLng([lat,lng]); }
    else { marker = L.marker([lat,lng], { draggable:true }).addTo(map); marker.on('dragend', ()=>{
      const p = marker.getLatLng(); latInput.value = p.lat.toFixed(6); lngInput.value = p.lng.toFixed(6);
    }); }
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
  }
  map.on('click', (e)=> setMarker(e.latlng.lat, e.latlng.lng));
  const btnUse = document.getElementById('btn-reg-use-pos');
  if (btnUse && navigator.geolocation) {
    btnUse.addEventListener('click', ()=>{
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        map.setView([lat,lng], 16);
        setMarker(lat,lng);
      }, err=> alert('No se pudo obtener ubicación: '+err.message));
    });
  }
  // Geocodificar campo "Ubicación" automáticamente
  const locationInput = form.elements['location'];
  if (locationInput) {
    let geoTimer = null;
    const geocode = async (q) => {
      if (!q || q.trim().length < 3) return;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const { lat, lon } = data[0];
          const plat = parseFloat(lat), plon = parseFloat(lon);
          if (isFinite(plat) && isFinite(plon)) {
            map.setView([plat, plon], 15);
            setMarker(plat, plon);
          }
        }
      } catch(_) { /* silencioso */ }
    };
    locationInput.addEventListener('input', () => {
      if (geoTimer) clearTimeout(geoTimer);
      geoTimer = setTimeout(() => geocode(locationInput.value), 600);
    });
    locationInput.addEventListener('blur', () => geocode(locationInput.value));
  }
}

function ensureLeafletAssets(onReady) {
  const hasCss = !!document.querySelector('link[href*="leaflet.css"]');
  const hasJs = !!window.L || !!document.querySelector('script[src*="leaflet.js"]');
  if (!hasCss) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  if (!window.L && !hasJs) {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => onReady && onReady();
    s.onerror = () => onReady && onReady();
    document.body.appendChild(s);
    return;
  }
  // Si ya estaba cargado
  onReady && onReady();
}

export function renderApp() {
  const main = document.getElementById('app-main');
  const sessionBar = document.getElementById('session-bar');
  const subtitle = document.getElementById('header-subtitle');
  if (!main) return;
  main.innerHTML = '';
  sessionBar.innerHTML = '';

  if (!state.sessionRole) {
    subtitle.textContent = 'Registrate para comenzar';
    renderAuthView(main);
    return;
  }

  if (state.sessionRole === 'user') {
    const user = getCurrentUser();
    subtitle.textContent = user ? `Hola, ${user.name}` : 'Vecino';
    // Botones de sesión para usuario
    const btnProfile = document.createElement('button');
    btnProfile.className = 'btn';
    btnProfile.textContent = 'Mi perfil';
    btnProfile.addEventListener('click', ()=>{ state.uiView = 'profile'; renderApp(); });
    sessionBar.appendChild(btnProfile);
    addLogout(sessionBar);
    if (state.uiView === 'profile') { renderProfileView(main); }
    else { renderUserView(main); }
  } else if (state.sessionRole === 'commerce') {
    const com = getCurrentCommerce();
    subtitle.textContent = com ? `Comercio: ${com.name || 'Mi comercio'}` : 'Comercio';
    // Botones de sesión para comercio
    const btnProfile = document.createElement('button');
    btnProfile.className = 'btn';
    btnProfile.textContent = 'Mi perfil';
    btnProfile.addEventListener('click', ()=>{ state.uiView = 'profile'; renderApp(); });
    sessionBar.appendChild(btnProfile);
    const btnStats = document.createElement('button');
    btnStats.className = 'btn';
    btnStats.style.marginLeft = '0.4rem';
    btnStats.textContent = 'Estadísticas';
    btnStats.addEventListener('click', ()=>{ state.uiView = 'stats'; renderApp(); });
    sessionBar.appendChild(btnStats);
    addLogout(sessionBar);
    if (state.uiView === 'profile') { renderProfileView(main); }
    else if (state.uiView === 'stats') { renderCommerceStatsView(main); }
    else { renderCommerceView(main); }
  }
}
