// views.js
import { state, getCurrentCommerce, getCurrentUser } from './state.js';
import { saveData } from './storage.js';
import { createPromotionCard, createPromotionForm, isPromoValidForUser, redeemPromotionCode } from './promotions.js';

export let userFilters = { search: '', category: 'Todas', neighborhood: '' };

export function renderUserView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'user-view';
  const title = document.createElement('h2');
  // Ajustar título según filtro de comercio
  if (state.mapState.selectedCommerceId) {
    const comSel = state.data.commerces.find(c=>c.id===state.mapState.selectedCommerceId);
    title.textContent = comSel ? 'Promos de: ' + comSel.name : 'Promos cerca tuyo';
  } else {
    title.textContent = 'Promos cerca tuyo';
  }
  const headerBox = document.createElement('div');
  headerBox.className = 'section-header';
  headerBox.appendChild(title);
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Filtrá por texto, categoría o barrio. En esta demo los datos se guardan en tu navegador.';
  headerBox.appendChild(p);
  wrapper.appendChild(headerBox);
  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'filters';
  filtersDiv.innerHTML = `
    <input id="filter-search" placeholder="Buscar por comercio, promo o barrio…" />
    <select id="filter-category">
      <option value="Todas">Todas las categorías</option>
      <option value="Gastronomía">Gastronomía</option>
      <option value="Almacén">Almacén</option>
      <option value="Belleza">Belleza</option>
      <option value="Servicios">Servicios</option>
      <option value="Otros">Otros</option>
    </select>
    <label style="display:flex;align-items:center;gap:0.35rem;font-size:0.9rem;">
      Radio (km)
      <input id="radius-km" type="number" min="0.1" step="0.1" style="width:5rem" />
    </label>
    <button class="btn" id="btn-user-locate">Usar mi ubicación</button>
    <button class="btn" id="btn-toggle-map">${state.mapState.mapOpen ? 'Ocultar mapa' : 'Mapa'}</button>
  `;
  wrapper.appendChild(filtersDiv);
  if (state.mapState.mapOpen) {
    const panel = document.createElement('div');
    panel.className = 'map-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <strong>Mapa de comercios</strong>
        <button class="panel-close" id="btn-close-map" aria-label="Cerrar">×</button>
      </div>
      <div id="commerces-map" style="height:360px;border:1px solid #ddd;border-radius:0.75rem;"></div>
      <div id="nearby-list" style="margin-top:0.5rem;"></div>`;
    wrapper.appendChild(panel);
  }
  setTimeout(() => {
    document.getElementById('filter-search').value = userFilters.search;
    document.getElementById('filter-category').value = userFilters.category;
    document.getElementById('filter-search').addEventListener('input', e => { userFilters.search = e.target.value; document.dispatchEvent(new CustomEvent('rerender-app')); });
    document.getElementById('filter-category').addEventListener('change', e => { userFilters.category = e.target.value; document.dispatchEvent(new CustomEvent('rerender-app')); });
    const radiusEl = document.getElementById('radius-km');
    if (radiusEl) {
      radiusEl.value = (state.mapState && state.mapState.radiusKm) ? state.mapState.radiusKm : 1;
      radiusEl.addEventListener('change', () => {
        const v = parseFloat(radiusEl.value);
        if (isFinite(v) && v > 0) { state.mapState.radiusKm = v; document.dispatchEvent(new CustomEvent('rerender-app')); }
      });
    }
    const btnLocate = document.getElementById('btn-user-locate');
    if (btnLocate && navigator.geolocation) {
      btnLocate.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(pos => {
          state.mapState.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          document.dispatchEvent(new CustomEvent('rerender-app'));
        }, err => alert('No se pudo obtener ubicación: ' + err.message));
      });
    }
    const btnToggleMap = document.getElementById('btn-toggle-map');
    if (btnToggleMap) btnToggleMap.addEventListener('click', () => { state.mapState.mapOpen = !state.mapState.mapOpen; document.dispatchEvent(new CustomEvent('rerender-app')); });
    const btnCloseMap = document.getElementById('btn-close-map');
    if (btnCloseMap) btnCloseMap.addEventListener('click', () => { state.mapState.mapOpen = false; document.dispatchEvent(new CustomEvent('rerender-app')); });
  },0);
  const grid = document.createElement('div');
  grid.className = 'grid';
  let promosFiltradas = state.data.promotions.filter(p => {
    if (!isPromoValidForUser(p)) return false;
    const comRef = state.data.commerces.find(c=>c.id===p.commerceId);
    const text = (p.title||'') + ' ' + (p.commerceName||'') + ' ' + (p.description||'') + ' ' + (p.neighborhood||'') + ' ' + (comRef && comRef.neighborhood ? comRef.neighborhood : '');
    const search = userFilters.search.toLowerCase();
    if (search && !text.toLowerCase().includes(search)) return false;
    if (userFilters.category !== 'Todas' && p.category !== userFilters.category) return false;
    return true;
  });
  // Filtro por radio (requiere userPos y lat/lng del comercio)
  if (state.mapState.userPos) {
    const pos = state.mapState.userPos;
    const radius = state.mapState.radiusKm || 1;
    promosFiltradas = promosFiltradas.filter(p => {
      const com = state.data.commerces.find(c=>c.id===p.commerceId);
      if (!com || !isFinite(com.lat) || !isFinite(com.lng)) return false; // si comercio sin coords lo excluimos dentro de radio
      const d = haversineKm(pos.lat,pos.lng,com.lat,com.lng);
      return d <= radius;
    });
  }
  // Filtro por comercio seleccionado desde el mapa
  if (state.mapState.selectedCommerceId) {
    promosFiltradas = promosFiltradas.filter(p=>p.commerceId === state.mapState.selectedCommerceId);
  }

  // Botón para limpiar filtro comercio si está activo
  if (state.mapState.selectedCommerceId) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn';
    clearBtn.textContent = 'Ver todos los comercios en el radio';
    clearBtn.style.marginBottom='0.5rem';
    clearBtn.addEventListener('click', () => { state.mapState.selectedCommerceId = null; document.dispatchEvent(new CustomEvent('rerender-app')); });
    wrapper.appendChild(clearBtn);
  }
  if (promosFiltradas.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    if (state.mapState.selectedCommerceId) {
      empty.textContent = 'Este comercio no tiene ningún cupón activo disponible.';
    } else if (state.mapState.userPos) {
      empty.textContent = 'No hay promociones dentro del radio seleccionado.';
    } else {
      empty.textContent = 'No hay promos con esos filtros por ahora.';
    }
    grid.appendChild(empty);
  } else {
    promosFiltradas.forEach(promo => grid.appendChild(createPromotionCard(promo,'user')));
  }
  wrapper.appendChild(grid);
  container.appendChild(wrapper);

  // Inicializar mapa Leaflet si el panel está abierto
  if (state.mapState.mapOpen) initOrUpdateMap();
}

export function renderCommerceView(container) {
  const currentCommerce = getCurrentCommerce();
  if (!currentCommerce) { renderCommerceLogin(container); return; }
  // Se elimina el botón "Cambiar comercio" para simplificar el panel
  const layout = document.createElement('div');
  layout.className = 'layout-two-columns';
  const left = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = 'Panel de ' + (currentCommerce.name || 'Mi comercio');
  left.appendChild(h2);
  const info = document.createElement('p');
  info.className = 'muted';
  info.textContent = 'Barrio: ' + (currentCommerce.neighborhood || 'Sin especificar') + ' · Dirección: ' + (currentCommerce.address || '—');
  left.appendChild(info);
  // Se quita la línea de "Ubicación fijada en el registro"
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const btnNew = document.createElement('button');
  btnNew.className = 'btn primary';
  btnNew.textContent = '+ Nueva promoción';
  btnNew.addEventListener('click', () => { state.promoEditingId = '__new__'; document.dispatchEvent(new CustomEvent('rerender-app')); });
  toolbar.appendChild(btnNew);
  left.appendChild(toolbar);

  // Panel mejorado para canjear códigos
  const redeemPanel = document.createElement('div');
  redeemPanel.className = 'form';
  redeemPanel.style.margin = '0.25rem 0 0.75rem';
  redeemPanel.innerHTML = `
    <h3>Canjear código del cliente</h3>
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
      <input id="redeem-code" placeholder="Ej: VERANO10" style="max-width:14rem;text-transform:uppercase;" />
      <button class="btn" id="btn-redeem-code">Canjear</button>
      <span id="redeem-msg" class="muted" style="font-size:0.8rem;"></span>
    </div>
    <p class="muted" style="margin-top:0.4rem;font-size:0.8rem;">Sugerencia: pegá el código y presioná Enter.</p>
  `;
  left.appendChild(redeemPanel);
  setTimeout(()=>{
    const codeInput = redeemPanel.querySelector('#redeem-code');
    const btnRedeem = redeemPanel.querySelector('#btn-redeem-code');
    const msg = redeemPanel.querySelector('#redeem-msg');
    function handleRedeem() {
      const code = (codeInput.value||'').trim();
      if (!code) { msg.textContent = 'Ingresá un código'; return; }
      const res = redeemPromotionCode(code);
      if (res.ok) {
        msg.textContent = 'Canje registrado';
        msg.style.color = '#065f46';
        codeInput.value = '';
        document.dispatchEvent(new CustomEvent('rerender-app'));
      } else {
        msg.textContent = res.message || 'No se pudo canjear';
        msg.style.color = '#b91c1c';
      }
    }
    btnRedeem.addEventListener('click', handleRedeem);
    codeInput.addEventListener('keydown', (ev)=>{ if (ev.key === 'Enter') { ev.preventDefault(); handleRedeem(); } });
    codeInput.addEventListener('input', ()=>{ codeInput.value = codeInput.value.toUpperCase(); msg.textContent=''; msg.style.color=''; });
  },0);
  const h3 = document.createElement('h3');
  h3.textContent = 'Mis promociones';
  left.appendChild(h3);
  const grid = document.createElement('div');
  grid.className = 'grid';
  const promosCommerce = state.data.promotions.filter(p => p.commerceId === currentCommerce.id);
  if (promosCommerce.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Todavía no creaste promociones.';
    grid.appendChild(empty);
  } else {
    promosCommerce.forEach(promo => grid.appendChild(createPromotionCard(promo,'commerce')));
  }
  left.appendChild(grid);
  layout.appendChild(left);
  const right = document.createElement('div');
  if (state.promoEditingId !== null) {
    right.appendChild(createPromotionForm());
  }
  layout.appendChild(right);
  container.appendChild(layout);
}

export function renderCommerceLogin(container) {
  const h2 = document.createElement('h2');
  h2.textContent = 'Ingresar como comercio';
  container.appendChild(h2);
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Si el comercio no existe, se creará automáticamente y quedará guardado en este navegador.';
  container.appendChild(p);
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>Nombre del comercio
      <input name="name" required />
    </label>
    <label>Dirección (opcional)
      <input name="address" />
    </label>
    <label>Barrio (opcional)
      <input name="neighborhood" />
    </label>
    <div class="form-actions">
      <button class="btn primary" type="submit">Entrar al panel</button>
    </div>
  `;
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Mantener para compatibilidad si se usa
  });
  container.appendChild(form);
}

// ====== Perfil (User/Commerce) ======
export function renderProfileView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form';
  const role = state.sessionRole;
  if (role === 'user') {
    const user = getCurrentUser();
    wrapper.innerHTML = `
      <h2>Mi perfil (Vecino)</h2>
      <form id="profile-user-form">
        <label>Nombre
          <input name="name" required />
        </label>
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Contraseña
          <input type="password" name="password" required minlength="4" />
        </label>
        <div class="form-actions">
          <button type="submit" class="btn primary">Guardar</button>
          <button type="button" id="btn-cancel-profile" class="btn" style="margin-left:0.5rem;">Cancelar</button>
        </div>
      </form>
    `;
    const form = wrapper.querySelector('#profile-user-form');
    if (user) {
      form.elements['name'].value = user.name || '';
      form.elements['email'].value = user.email || '';
      form.elements['password'].value = user.password || '';
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!user) return;
      const fd = new FormData(form);
      user.name = (fd.get('name')||'').toString().trim();
      user.email = (fd.get('email')||'').toString().trim().toLowerCase();
      user.password = (fd.get('password')||'').toString();
      saveData();
      state.uiView = 'default';
      document.dispatchEvent(new CustomEvent('rerender-app'));
    });
    wrapper.querySelector('#btn-cancel-profile').addEventListener('click', ()=>{ state.uiView='default'; document.dispatchEvent(new CustomEvent('rerender-app')); });
  } else if (role === 'commerce') {
    const com = getCurrentCommerce();
    wrapper.innerHTML = `
      <h2>Mi perfil (Comercio)</h2>
      <form id="profile-com-form">
        <label>Nombre del comercio
          <input name="name" required />
        </label>
        <label>Rubro
          <input name="category" required />
        </label>
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Contraseña
          <input type="password" name="password" required minlength="4" />
        </label>
        <label>Dirección / Referencia (visible)
          <input name="address" />
        </label>
        <div id="profile-com-map" style="height:300px;border:1px solid #ddd;border-radius:0.5rem;margin:0.5rem 0;"></div>
        <div class="form-row" style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
          <input name="lat" placeholder="Lat" style="width:8rem" required />
          <input name="lng" placeholder="Lng" style="width:8rem" required />
          <button type="button" class="btn" id="btn-prof-use-pos">Usar mi ubicación</button>
          <span class="muted" style="font-size:0.75rem;">Consejo: hacé clic en el mapa para colocar el pin.</span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn primary">Guardar</button>
          <button type="button" id="btn-cancel-profile" class="btn" style="margin-left:0.5rem;">Cancelar</button>
        </div>
      </form>
    `;
    const form = wrapper.querySelector('#profile-com-form');
    if (com) {
      form.elements['name'].value = com.name || '';
      form.elements['category'].value = com.category || '';
      form.elements['email'].value = com.email || '';
      form.elements['password'].value = com.password || '';
      form.elements['address'].value = com.address || com.neighborhood || '';
      form.elements['lat'].value = com.lat != null ? String(com.lat) : '';
      form.elements['lng'].value = com.lng != null ? String(com.lng) : '';
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!com) return;
      const fd = new FormData(form);
      com.name = (fd.get('name')||'').toString().trim();
      com.category = (fd.get('category')||'').toString().trim();
      com.email = (fd.get('email')||'').toString().trim().toLowerCase();
      com.password = (fd.get('password')||'').toString();
      com.address = (fd.get('address')||'').toString().trim();
      com.neighborhood = com.address;
      const lat = parseFloat((fd.get('lat')||'').toString());
      const lng = parseFloat((fd.get('lng')||'').toString());
      if (!isFinite(lat) || !isFinite(lng)) { alert('Lat/Lng inválidas'); return; }
      com.lat = lat; com.lng = lng;
      saveData();
      state.uiView = 'default';
      document.dispatchEvent(new CustomEvent('rerender-app'));
    });
    wrapper.querySelector('#btn-cancel-profile').addEventListener('click', ()=>{ state.uiView='default'; document.dispatchEvent(new CustomEvent('rerender-app')); });

    // Inicializar mapa de perfil (igual al de registro)
    setTimeout(initProfileCommerceMap, 0);
  }
  container.appendChild(wrapper);
}

export function renderCommerceStatsView(container) {
  const com = getCurrentCommerce();
  const wrapper = document.createElement('div');
  wrapper.className = 'form';
  const title = document.createElement('h2');
  title.textContent = 'Estadísticas de ' + (com?.name || 'mi comercio');
  wrapper.appendChild(title);

  const promos = state.data.promotions.filter(p => p.commerceId === (com?.id));
  const now = Date.now();
  const isExpired = p => (p.validTo && new Date(p.validTo).getTime() < now);
  const total = promos.length;
  const actives = promos.filter(p => p.isActive && !isExpired(p)).length;
  const paused = promos.filter(p => !p.isActive).length;
  const expired = promos.filter(p => isExpired(p)).length;
  const totalRedeemed = promos.reduce((acc,p)=> acc + (p.redeemedCount||0), 0);
  const maxSum = promos.reduce((acc,p)=> acc + ((p.maxCoupons!=null)? p.maxCoupons:0), 0);
  const usagePct = maxSum>0 ? Math.round((totalRedeemed/maxSum)*100) : null;

  const metrics = document.createElement('div');
  metrics.style.display='grid';
  metrics.style.gridTemplateColumns='repeat(auto-fit, minmax(180px, 1fr))';
  metrics.style.gap='0.5rem';
  metrics.innerHTML = `
    <div class="card"><h3 class="card-title">Promos</h3><p class="card-text">Total: ${total}</p><p class="card-text small">Activas: ${actives} · Pausadas: ${paused} · Vencidas: ${expired}</p></div>
    <div class="card"><h3 class="card-title">Canjes</h3><p class="card-text">Total canjeados: ${totalRedeemed}</p><p class="card-text small">${usagePct!=null? 'Uso de stock: '+usagePct+'%':''}</p></div>
  `;
  wrapper.appendChild(metrics);

  // Por categoría
  const byCat = {};
  promos.forEach(p=>{ const k=p.category||'Otros'; if(!byCat[k]) byCat[k]={count:0,redeemed:0}; byCat[k].count++; byCat[k].redeemed += (p.redeemedCount||0); });
  const catList = Object.entries(byCat).map(([k,v])=>`<li>${k}: ${v.count} promos · ${v.redeemed} canjes</li>`).join('');
  const catCard = document.createElement('div');
  catCard.className = 'card';
  catCard.innerHTML = `<h3 class="card-title">Por categoría</h3><ul>${catList||'<li class="muted">Sin datos</li>'}</ul>`;
  wrapper.appendChild(catCard);

  // Tabla de promos
  const tableCard = document.createElement('div');
  tableCard.className = 'card';
  const rows = promos.map(p=>{
    const from = p.validFrom ? new Date(p.validFrom).toLocaleDateString() : '—';
    const to = p.validTo ? new Date(p.validTo).toLocaleDateString() : '—';
    const max = p.maxCoupons!=null? p.maxCoupons : '∞';
    const status = (!p.isActive)?'Pausada':(isExpired(p)?'Vencida':'Activa');
    return `<tr>
      <td>${p.title}</td>
      <td>${p.promoCode||'—'}</td>
      <td>${status}</td>
      <td>${p.redeemedCount||0}</td>
      <td>${max}</td>
      <td>${from} – ${to}</td>
    </tr>`;
  }).join('');
  tableCard.innerHTML = `
    <h3 class="card-title">Detalle de promociones</h3>
    <div style="overflow:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid #e5e7eb;">
            <th style="padding:6px 4px;">Título</th>
            <th style="padding:6px 4px;">Código</th>
            <th style="padding:6px 4px;">Estado</th>
            <th style="padding:6px 4px;">Canjeados</th>
            <th style="padding:6px 4px;">Máx.</th>
            <th style="padding:6px 4px;">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" class="muted">Sin promociones</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="form-actions">
      <button class="btn" id="btn-export-csv">Exportar CSV</button>
      <button class="btn" id="btn-back" style="margin-left:0.5rem;">Volver</button>
    </div>
  `;
  wrapper.appendChild(tableCard);

  setTimeout(()=>{
    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', ()=>{ state.uiView='default'; document.dispatchEvent(new CustomEvent('rerender-app')); });
    const btnCsv = document.getElementById('btn-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', ()=>{
      const lines = [['Titulo','Codigo','Estado','Canjeados','Max','Desde','Hasta']];
      promos.forEach(p=>{
        const from = p.validFrom || '';
        const to = p.validTo || '';
        const max = p.maxCoupons!=null? p.maxCoupons : '';
        const status = (!p.isActive)?'Pausada':(isExpired(p)?'Vencida':'Activa');
        lines.push([p.title||'', p.promoCode||'', status, String(p.redeemedCount||0), String(max), from, to]);
      });
      const csv = lines.map(r=> r.map(v=> '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='promos_stats.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
    });
  },0);

  container.appendChild(wrapper);
}

// ====== Mapa (User) ======
let __leafletMap = null;
let __markersLayer = null;
let __userMarker = null;
let __radiusCircle = null;

function initOrUpdateMap() {
  const mapContainer = document.getElementById('commerces-map');
  const radiusInput = document.getElementById('radius-km');
  const btnLocate = document.getElementById('btn-user-locate');
  if (!mapContainer || !window.L) return; // Leaflet no cargado o contenedor inexistente

  // Preparar inputs
  if (radiusInput) {
    radiusInput.value = (state.mapState && state.mapState.radiusKm) ? state.mapState.radiusKm : 1;
    if (!radiusInput.dataset.wired) {
      radiusInput.addEventListener('change', () => {
        const v = parseFloat(radiusInput.value);
        if (isFinite(v) && v>0) { state.mapState.radiusKm = v; updateMapLayers(); updateNearbyList(); }
      });
      radiusInput.dataset.wired = '1';
    }
  }
  if (btnLocate && navigator.geolocation) {
    if (!btnLocate.dataset.wired) {
      btnLocate.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(pos => {
          state.mapState.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          updateMapLayers(true);
          updateNearbyList();
        }, err => alert('No se pudo obtener ubicación: ' + err.message));
      });
      btnLocate.dataset.wired = '1';
    }
  }

  // Si existe un mapa previo (de otro contenedor), destruirlo para evitar fugas
  if (__leafletMap) {
    try { __leafletMap.remove(); } catch(_) {}
    __leafletMap = null; __markersLayer = null; __userMarker = null; __radiusCircle = null;
  }
  // Crear mapa nuevo
  if (!__leafletMap) {
    // Centro inicial: si hay comercios con coords, centrar a sus bounds; si no, (0,0)
    __leafletMap = L.map(mapContainer).setView([0,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(__leafletMap);
    __markersLayer = L.layerGroup().addTo(__leafletMap);
  }
  updateMapLayers(true);
  updateNearbyList();
}

function updateMapLayers(fit=false) {
  if (!__leafletMap || !window.L) return;
  __markersLayer.clearLayers();

  const commerces = state.data.commerces.filter(c=> isFinite(c.lat) && isFinite(c.lng));
  const markers = [];
  commerces.forEach(c => {
    const m = L.marker([c.lat, c.lng]);
    m.bindPopup(`<strong>${c.name}</strong><br/>${c.address||''}<br/><button data-map-select="${c.id}" style="margin-top:4px;padding:4px 8px;font-size:0.65rem;">Ver promos</button>`);
    m.on('popupopen', () => {
      // Delegar evento del botón dentro del popup
      const btn = document.querySelector(`button[data-map-select="${c.id}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          state.mapState.selectedCommerceId = c.id;
          document.dispatchEvent(new CustomEvent('rerender-app'));
        }, { once: true });
      }
    });
    __markersLayer.addLayer(m);
    markers.push(m);
  });

  // User marker y círculo
  if (__userMarker) { __leafletMap.removeLayer(__userMarker); __userMarker=null; }
  if (__radiusCircle) { __leafletMap.removeLayer(__radiusCircle); __radiusCircle=null; }
  const userPos = state.mapState.userPos;
  const radiusM = (state.mapState.radiusKm||1) * 1000;
  if (userPos) {
    __userMarker = L.marker([userPos.lat, userPos.lng], { opacity:0.9 }).addTo(__leafletMap).bindPopup('Tu ubicación');
    __radiusCircle = L.circle([userPos.lat, userPos.lng], { radius: radiusM, color:'#2a7', fillColor:'#2a7', fillOpacity:0.08 }).addTo(__leafletMap);
  }

  if (fit) {
    const group = new L.featureGroup([
      ...markers.map(m=>m),
      ...(userPos && __radiusCircle ? [__radiusCircle] : [])
    ]);
    if (group.getLayers().length>0) {
      __leafletMap.fitBounds(group.getBounds().pad(0.15));
    } else {
      __leafletMap.setView([0,0], 2);
    }
  }
}

function updateNearbyList() {
  const list = document.getElementById('nearby-list');
  if (!list) return;
  const userPos = state.mapState.userPos;
  const radiusKm = state.mapState.radiusKm || 1;
  if (!userPos) {
    list.innerHTML = '<p class="muted">Usá "Usar mi ubicación" para ver comercios cercanos.</p>';
    return;
  }
  const within = state.data.commerces
    .filter(c => isFinite(c.lat) && isFinite(c.lng))
    .map(c => ({ c, distKm: haversineKm(userPos.lat, userPos.lng, c.lat, c.lng) }))
    .filter(x => x.distKm <= radiusKm)
    .sort((a,b)=>a.distKm-b.distKm);
  if (within.length===0) {
    list.innerHTML = '<p class="muted">No hay comercios dentro del radio seleccionado.</p>';
    return;
  }
  const items = within.map(x => `<li><strong>${x.c.name}</strong> · ${x.distKm.toFixed(2)} km ${x.c.neighborhood? ' · '+x.c.neighborhood: ''}</li>`).join('');
  list.innerHTML = `<h3>Comercios cercanos</h3><ul>${items}</ul>`;
}

function haversineKm(lat1,lng1,lat2,lng2) {
  const R = 6371; // km
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

// ====== Utilidades Leaflet para perfil de comercio ======
function ensureLeafletAssets_local(onReady) {
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
  onReady && onReady();
}

function initProfileCommerceMap() {
  const mapEl = document.getElementById('profile-com-map');
  const form = document.getElementById('profile-com-form');
  if (!mapEl || !form) return;
  if (!window.L) { ensureLeafletAssets_local(() => setTimeout(initProfileCommerceMap, 100)); return; }
  // Reset posible instancia previa
  if (mapEl._leaflet_id) {
    try { mapEl._leaflet_id = null; } catch(_) {}
  }
  const latInput = form.elements['lat'];
  const lngInput = form.elements['lng'];
  const com = getCurrentCommerce();
  const startLat = (com && isFinite(com.lat)) ? com.lat : -32.95;
  const startLng = (com && isFinite(com.lng)) ? com.lng : -60.66;
  const map = L.map(mapEl).setView([ startLat, startLng ], (com && isFinite(com.lat)) ? 14 : 12);
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
  if (com && isFinite(com.lat) && isFinite(com.lng)) setMarker(com.lat, com.lng);
  map.on('click', (e)=> setMarker(e.latlng.lat, e.latlng.lng));
  const btnUse = document.getElementById('btn-prof-use-pos');
  if (btnUse && navigator.geolocation) {
    btnUse.addEventListener('click', ()=>{
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        map.setView([lat,lng], 16);
        setMarker(lat,lng);
      }, err=> alert('No se pudo obtener ubicación: '+err.message));
    });
  }
  // Geocodificar dirección
  const addressInput = form.elements['address'];
  if (addressInput) {
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
    addressInput.addEventListener('input', () => { if (geoTimer) clearTimeout(geoTimer); geoTimer = setTimeout(() => geocode(addressInput.value), 600); });
    addressInput.addEventListener('blur', () => geocode(addressInput.value));
  }
}
