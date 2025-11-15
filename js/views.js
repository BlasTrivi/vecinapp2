// views.js
import { state, getCurrentCommerce } from './state.js';
import { createPromotionCard, createPromotionForm, isPromoValidForUser, redeemPromotionCode } from './promotions.js';
import { saveData } from './storage.js';

export let userFilters = { search: '', category: 'Todas', neighborhood: '' };

export function renderUserView(container) {
  const wrapper = document.createElement('div');
  const title = document.createElement('h2');
  // Ajustar título según filtro de comercio
  if (state.mapState.selectedCommerceId) {
    const comSel = state.data.commerces.find(c=>c.id===state.mapState.selectedCommerceId);
    title.textContent = comSel ? 'Promos de: ' + comSel.name : 'Promos cerca tuyo';
  } else {
    title.textContent = 'Promos cerca tuyo';
  }
  wrapper.appendChild(title);
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Filtrá por texto, categoría o barrio. En esta demo los datos se guardan en tu navegador.';
  wrapper.appendChild(p);
  // Controles de mapa: radio + ubicación
  const mapControls = document.createElement('div');
  mapControls.className = 'toolbar';
  mapControls.style.margin = '0.5rem 0';
  mapControls.innerHTML = `
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
      <label style="display:flex;align-items:center;gap:0.35rem;font-size:0.9rem;">
        Radio (km)
        <input id="radius-km" type="number" min="0.1" step="0.1" style="width:5rem" />
      </label>
      <button class="btn" id="btn-user-locate">Usar mi ubicación</button>
    </div>`;
  wrapper.appendChild(mapControls);
  const mapDiv = document.createElement('div');
  mapDiv.id = 'commerces-map';
  mapDiv.style.height = '360px';
  mapDiv.style.border = '1px solid #ddd';
  mapDiv.style.borderRadius = '0.75rem';
  mapDiv.style.marginBottom = '0.75rem';
  wrapper.appendChild(mapDiv);
  const nearbyList = document.createElement('div');
  nearbyList.id = 'nearby-list';
  wrapper.appendChild(nearbyList);
  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'filters';
  filtersDiv.innerHTML = `
    <input id="filter-search" placeholder="Buscar por promo o comercio…" />
    <select id="filter-category">
      <option value="Todas">Todas las categorías</option>
      <option value="Gastronomía">Gastronomía</option>
      <option value="Almacén">Almacén</option>
      <option value="Belleza">Belleza</option>
      <option value="Servicios">Servicios</option>
      <option value="Otros">Otros</option>
    </select>
    <input id="filter-neighborhood" placeholder="Barrio (ej: Echesortu)" />
  `;
  wrapper.appendChild(filtersDiv);
  setTimeout(() => {
    document.getElementById('filter-search').value = userFilters.search;
    document.getElementById('filter-category').value = userFilters.category;
    document.getElementById('filter-neighborhood').value = userFilters.neighborhood;
    document.getElementById('filter-search').addEventListener('input', e => { userFilters.search = e.target.value; document.dispatchEvent(new CustomEvent('rerender-app')); });
    document.getElementById('filter-category').addEventListener('change', e => { userFilters.category = e.target.value; document.dispatchEvent(new CustomEvent('rerender-app')); });
    document.getElementById('filter-neighborhood').addEventListener('input', e => { userFilters.neighborhood = e.target.value; document.dispatchEvent(new CustomEvent('rerender-app')); });
  },0);
  const grid = document.createElement('div');
  grid.className = 'grid';
  let promosFiltradas = state.data.promotions.filter(p => {
    if (!isPromoValidForUser(p)) return false;
    const text = (p.title||'') + ' ' + (p.commerceName||'') + ' ' + (p.description||'');
    const search = userFilters.search.toLowerCase();
    if (search && !text.toLowerCase().includes(search)) return false;
    if (userFilters.category !== 'Todas' && p.category !== userFilters.category) return false;
    if (userFilters.neighborhood) {
      const neigh = (p.neighborhood||'').toLowerCase();
      if (!neigh.includes(userFilters.neighborhood.toLowerCase())) return false;
    }
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

  // Inicializar mapa Leaflet si está disponible
  initOrUpdateMap();
}

export function renderCommerceView(container) {
  const currentCommerce = getCurrentCommerce();
  if (!currentCommerce) { renderCommerceLogin(container); return; }
  const topBar = document.createElement('div');
  topBar.className = 'toolbar toolbar-right';
  const btnChange = document.createElement('button');
  btnChange.className = 'btn';
  btnChange.textContent = 'Cambiar comercio';
  btnChange.addEventListener('click', () => {
    state.currentCommerceId = null;
    state.promoEditingId = null;
    document.dispatchEvent(new CustomEvent('clear-commerce')); // manejado en main
  });
  topBar.appendChild(btnChange);
  container.appendChild(topBar);
  const layout = document.createElement('div');
  layout.className = 'layout-two-columns';
  const left = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = 'Panel de ' + currentCommerce.name;
  left.appendChild(h2);
  const info = document.createElement('p');
  info.className = 'muted';
  info.textContent = 'Barrio: ' + (currentCommerce.neighborhood || 'Sin especificar') + ' · Dirección: ' + (currentCommerce.address || '—');
  left.appendChild(info);
  // Pequeño panel para ubicación del comercio (lat/lng)
  const locPanel = document.createElement('div');
  locPanel.style.display='flex';
  locPanel.style.flexWrap='wrap';
  locPanel.style.gap='0.5rem';
  locPanel.style.margin='0.5rem 0';
  locPanel.innerHTML = `
    <input id="com-lat" placeholder="Lat" style="width:8rem;padding:0.35rem;border:1px solid #ccc;border-radius:0.5rem" />
    <input id="com-lng" placeholder="Lng" style="width:8rem;padding:0.35rem;border:1px solid #ccc;border-radius:0.5rem" />
    <button class="btn" id="btn-com-use-pos">Usar mi ubicación</button>
    <button class="btn" id="btn-com-save-pos">Guardar ubicación</button>
    <span class="muted" style="font-size:0.75rem;">Sugerencia: posicioná tu comercio para aparecer en el mapa.</span>
  `;
  left.appendChild(locPanel);
  setTimeout(()=>{
    const latEl = locPanel.querySelector('#com-lat');
    const lngEl = locPanel.querySelector('#com-lng');
    latEl.value = (currentCommerce.lat != null) ? String(currentCommerce.lat) : '';
    lngEl.value = (currentCommerce.lng != null) ? String(currentCommerce.lng) : '';
    locPanel.querySelector('#btn-com-use-pos').addEventListener('click', ()=>{
      if (!navigator.geolocation) { alert('Geolocalización no disponible'); return; }
      navigator.geolocation.getCurrentPosition(pos=>{
        latEl.value = pos.coords.latitude.toFixed(6);
        lngEl.value = pos.coords.longitude.toFixed(6);
      }, err=>alert('No se pudo obtener ubicación: '+err.message));
    });
    locPanel.querySelector('#btn-com-save-pos').addEventListener('click', ()=>{
      const lat = parseFloat(latEl.value);
      const lng = parseFloat(lngEl.value);
      if (!isFinite(lat) || !isFinite(lng)) { alert('Lat/Lng inválidas'); return; }
      const idx = state.data.commerces.findIndex(c=>c.id===currentCommerce.id);
      if (idx>=0) {
        state.data.commerces[idx] = { ...state.data.commerces[idx], lat, lng };
        saveData();
        alert('Ubicación guardada');
        document.dispatchEvent(new CustomEvent('rerender-app'));
      }
    });
  },0);
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const btnNew = document.createElement('button');
  btnNew.className = 'btn primary';
  btnNew.textContent = '+ Nueva promoción';
  btnNew.addEventListener('click', () => { state.promoEditingId = null; document.dispatchEvent(new CustomEvent('rerender-app')); });
  toolbar.appendChild(btnNew);
  // Canje por código
  const redeemWrap = document.createElement('div');
  redeemWrap.style.display='flex';
  redeemWrap.style.alignItems='center';
  redeemWrap.style.gap='0.5rem';
  redeemWrap.style.marginLeft='0.75rem';
  redeemWrap.innerHTML = `
    <input id="redeem-code" placeholder="Código cliente" style="padding:0.35rem;font-size:0.7rem;border:1px solid #ccc;border-radius:0.4rem" />
    <button class="btn" id="btn-redeem-code">Canjear</button>
  `;
  toolbar.appendChild(redeemWrap);
  setTimeout(()=>{
    const btnRedeem = redeemWrap.querySelector('#btn-redeem-code');
    btnRedeem.addEventListener('click', () => {
      const codeInput = redeemWrap.querySelector('#redeem-code');
      const code = codeInput.value.trim();
      if (!code) return;
      const res = redeemPromotionCode(code);
      if (res.ok) { alert('Canje registrado'); document.dispatchEvent(new CustomEvent('rerender-app')); codeInput.value=''; } else { alert(res.message); }
    });
  },0);
  left.appendChild(toolbar);
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
  right.appendChild(createPromotionForm());
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
    radiusInput.addEventListener('change', () => {
      const v = parseFloat(radiusInput.value);
      if (isFinite(v) && v>0) { state.mapState.radiusKm = v; updateMapLayers(); updateNearbyList(); }
    });
  }
  if (btnLocate && navigator.geolocation) {
    btnLocate.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(pos => {
        state.mapState.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateMapLayers(true);
        updateNearbyList();
      }, err => alert('No se pudo obtener ubicación: ' + err.message));
    });
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
