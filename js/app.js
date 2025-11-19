// Claves de almacenamiento
const STORAGE_KEY = "vecinapp-data-v1";
const STORAGE_COMMERCE_ID_KEY = "vecinapp-current-commerce-id";
const STORAGE_USER_ID_KEY = "vecinapp-current-user-id";

// Estado principal
let state = {
  sessionRole: null, // 'user' | 'commerce'
  data: {
    commerces: [],
    promotions: [],
    users: []
  },
  currentCommerceId: null,
  currentUserId: null,
  promoEditingId: null
};

// Carga y guardado
function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { commerces: [], promotions: [], users: [] };
    const parsed = JSON.parse(raw);
    return {
      commerces: Array.isArray(parsed.commerces) ? parsed.commerces : [],
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : [],
      users: Array.isArray(parsed.users) ? parsed.users : []
    };
  } catch (e) {
    console.error("Error loading data", e);
    return { commerces: [], promotions: [], users: [] };
  }
}

function saveData() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (e) {
    console.error("Error saving data", e);
  }
}

function loadCurrentCommerceId() {
  const id = window.localStorage.getItem(STORAGE_COMMERCE_ID_KEY);
  return id || null;
}
function loadCurrentUserId() {
  const id = window.localStorage.getItem(STORAGE_USER_ID_KEY);
  return id || null;
}

function saveCurrentCommerceId() {
  if (state.currentCommerceId) {
    window.localStorage.setItem(STORAGE_COMMERCE_ID_KEY, state.currentCommerceId);
  } else {
    window.localStorage.removeItem(STORAGE_COMMERCE_ID_KEY);
  }
}
function saveCurrentUserId() {
  if (state.currentUserId) {
    window.localStorage.setItem(STORAGE_USER_ID_KEY, state.currentUserId);
  } else {
    window.localStorage.removeItem(STORAGE_USER_ID_KEY);
  }
}

// Utilidades
function uuid(prefix) {
  return (
    (prefix || "id") +
    "-" + Date.now() + "-" + Math.floor(Math.random() * 100000)
  );
}
function getCurrentCommerce() {
  return state.data.commerces.find(c => c.id === state.currentCommerceId) || null;
}
function getCurrentUser() {
  return state.data.users.find(u => u.id === state.currentUserId) || null;
}
function isPromoValidForUser(promo) {
  if (!promo.isActive) return false;
  const now = Date.now();
  if (promo.validTo) {
    const end = new Date(promo.validTo).getTime();
    if (end && end < now) return false;
  }
  if (promo.maxCoupons && (promo.redeemedCount || 0) >= promo.maxCoupons) return false;
  return true;
}

// Render principal
function renderApp() {
  const main = document.getElementById("app-main");
  const sessionBar = document.getElementById("session-bar");
  const subtitle = document.getElementById("header-subtitle");
  if (!main) return;
  main.innerHTML = "";
  sessionBar.innerHTML = "";

  if (!state.sessionRole) {
    subtitle.textContent = "Registrate para comenzar";
    renderAuthView(main);
    return;
  }

  if (state.sessionRole === "user") {
    const user = getCurrentUser();
    subtitle.textContent = user ? `Hola, ${user.name}` : "Vecino";
    addLogout(sessionBar);
    renderUserView(main);
  } else if (state.sessionRole === "commerce") {
    const com = getCurrentCommerce();
    subtitle.textContent = com ? `Comercio: ${com.name}` : "Comercio";
    addLogout(sessionBar);
    renderCommerceView(main);
  }
}

function addLogout(container) {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Cerrar sesión";
  btn.addEventListener("click", () => {
    state.sessionRole = null;
    state.currentUserId = null;
    state.currentCommerceId = null;
    saveCurrentUserId();
    saveCurrentCommerceId();
    renderApp();
  });
  container.appendChild(btn);
}

let userFilters = { search: "", category: "Todas", neighborhood: "" };

// Vista de registro
function renderAuthView(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "auth-stack";
  wrapper.innerHTML = `
    <div class="auth-card" aria-live="polite">
      <div class="auth-card-logo">
        <div class="logo-mark">VA</div>
      </div>
      <div class="auth-card-head">
        <p class="muted">Bienvenido a</p>
        <h2 id="auth-title">VecinAPP</h2>
        <p id="auth-subtitle">Publicá, descubrí y mové tus promos al instante.</p>
      </div>
      <div id="auth-content"></div>
      <div class="auth-extra">
        <button class="link" type="button" id="auth-forgot" disabled>¿Olvidaste tu contraseña?</button>
      </div>
      <div class="auth-cta">
        <span class="muted" id="auth-cta-label"></span>
        <button type="button" class="btn ghost" id="auth-toggle"></button>
      </div>
    </div>
  `;
  container.appendChild(wrapper);

  const content = wrapper.querySelector('#auth-content');
  const titleEl = wrapper.querySelector('#auth-title');
  const descEl = wrapper.querySelector('#auth-subtitle');
  const forgotBtn = wrapper.querySelector('#auth-forgot');
  const toggleBtn = wrapper.querySelector('#auth-toggle');
  const ctaLabel = wrapper.querySelector('#auth-cta-label');
  let currentMode = 'login';

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'login') {
      titleEl.textContent = 'Bienvenido a VecinAPP';
      descEl.textContent = 'Ingresá para descubrir promos o administrar tus beneficios.';
      ctaLabel.textContent = '¿No tenés cuenta?';
      toggleBtn.textContent = 'Registrarme';
      forgotBtn.hidden = false;
      forgotBtn.disabled = false;
      renderLogin();
    } else {
      titleEl.textContent = 'Crear cuenta en VecinAPP';
      descEl.textContent = 'Registrate como vecino o comercio para empezar a sumar promos.';
      ctaLabel.textContent = '¿Ya tenés cuenta?';
      toggleBtn.textContent = 'Iniciar sesión';
      forgotBtn.hidden = true;
      forgotBtn.disabled = true;
      renderRegister();
    }
  }

  toggleBtn.addEventListener('click', () => {
    setMode(currentMode === 'login' ? 'register' : 'login');
  });

  function renderRegister() {
    content.innerHTML = `
      <form id="register-form" class="auth-form">
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
          <label>Ubicación
            <input name="location" placeholder="Barrio o dirección" />
          </label>
        `;
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
        const exists = state.data.users.some(u=>u.email===email);
        if (exists) { alert('Ese email ya está registrado como vecino.'); return; }
        const newUser = { id: uuid('user'), name, email, password, acceptedTerms:true, createdAt:new Date().toISOString() };
        state.data.users.push(newUser); saveData(); state.currentUserId=newUser.id; saveCurrentUserId(); state.sessionRole='user'; renderApp();
      } else {
        const commerceName = (fd.get('commerceName')||'').toString().trim();
        const category = (fd.get('category')||'').toString().trim();
        const email = (fd.get('email')||'').toString().trim().toLowerCase();
        const password = (fd.get('password')||'').toString();
        const location = (fd.get('location')||'').toString().trim();
        if (!commerceName || !email || !password) return;
        const exists = state.data.commerces.some(c=>c.email===email);
        if (exists) { alert('Ese email ya está registrado como comercio.'); return; }
        const newCommerce = { id: uuid('com'), name: commerceName, category, email, password, address: location, neighborhood: location, acceptedTerms:true, createdAt:new Date().toISOString() };
        state.data.commerces.push(newCommerce); saveData(); state.currentCommerceId=newCommerce.id; saveCurrentCommerceId(); state.sessionRole='commerce'; renderApp();
      }
    });
  }

  function renderLogin() {
    content.innerHTML = `
      <form id="login-form" class="auth-form">
        <div class="role-toggle" aria-label="Seleccioná tu rol">
          <button type="button" class="role-btn active" data-role="user">Vecino</button>
          <button type="button" class="role-btn" data-role="commerce">Comercio</button>
        </div>
        <label class="field">
          <span>Email</span>
          <div class="input-field">
            <span class="input-icon">@</span>
            <input type="email" name="email" required placeholder="tu@email.com" />
          </div>
        </label>
        <label class="field">
          <span>Contraseña</span>
          <div class="input-field">
            <span class="input-icon">•••</span>
            <input type="password" name="password" required minlength="4" placeholder="••••••" />
          </div>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn primary">Iniciar sesión</button>
        </div>
      </form>
      <p class="muted auth-note">Demo sin cifrado ni recuperación automática.</p>
    `;
    const form = content.querySelector('#login-form');
    let loginRole = 'user';
    const roleButtons = form.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        loginRole = btn.dataset.role;
        roleButtons.forEach(b => b.classList.toggle('active', b === btn));
      });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = (fd.get('email')||'').toString().trim().toLowerCase();
      const password = (fd.get('password')||'').toString();
      if (!email || !password) return;
      if (loginRole === 'user') {
        const user = state.data.users.find(u=>u.email===email && u.password===password);
        if (!user) { alert('Credenciales incorrectas.'); return; }
        state.currentUserId = user.id; saveCurrentUserId(); state.sessionRole='user'; renderApp();
      } else {
        const com = state.data.commerces.find(c=>c.email===email && c.password===password);
        if (!com) { alert('Credenciales incorrectas.'); return; }
        state.currentCommerceId = com.id; saveCurrentCommerceId(); state.sessionRole='commerce'; renderApp();
      }
    });
  }

  // Mostrar login por defecto
  setMode('login');
}

function renderUserView(container) {
  const wrapper = document.createElement("div");

  const title = document.createElement("h2");
  title.textContent = "Promos cerca tuyo";
  wrapper.appendChild(title);

  const p = document.createElement("p");
  p.className = "muted";
  p.textContent =
    "Filtrá por texto, categoría o barrio. En esta demo los datos se guardan en tu navegador.";
  wrapper.appendChild(p);

  const filtersDiv = document.createElement("div");
  filtersDiv.className = "filters";
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
    document.getElementById("filter-search").value = userFilters.search;
    document.getElementById("filter-category").value =
      userFilters.category;
    document.getElementById("filter-neighborhood").value =
      userFilters.neighborhood;

    document
      .getElementById("filter-search")
      .addEventListener("input", (e) => {
        userFilters.search = e.target.value;
        renderApp();
      });

    document
      .getElementById("filter-category")
      .addEventListener("change", (e) => {
        userFilters.category = e.target.value;
        renderApp();
      });

    document
      .getElementById("filter-neighborhood")
      .addEventListener("input", (e) => {
        userFilters.neighborhood = e.target.value;
        renderApp();
      });
  }, 0);

  const grid = document.createElement("div");
  grid.className = "grid";

  const promosFiltradas = state.data.promotions.filter((p) => {
    if (!isPromoValidForUser(p)) return false;

    const text =
      (p.title || "") +
      " " +
      (p.commerceName || "") +
      " " +
      (p.description || "");
    const lowerText = text.toLowerCase();
    const search = userFilters.search.toLowerCase();
    if (search && !lowerText.includes(search)) return false;

    if (
      userFilters.category !== "Todas" &&
      p.category !== userFilters.category
    )
      return false;

    if (userFilters.neighborhood) {
      const neigh = (p.neighborhood || "").toLowerCase();
      if (!neigh.includes(userFilters.neighborhood.toLowerCase()))
        return false;
    }

    return true;
  });

  if (promosFiltradas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No hay promos con esos filtros por ahora.";
    grid.appendChild(empty);
  } else {
    promosFiltradas.forEach((promo) => {
      grid.appendChild(createPromotionCard(promo, "user"));
    });
  }

  wrapper.appendChild(grid);

  container.appendChild(wrapper);
}

function renderCommerceView(container) {
  const currentCommerce = getCurrentCommerce();

  if (!currentCommerce) {
    renderCommerceLogin(container);
  } else {
    const topBar = document.createElement("div");
    topBar.className = "toolbar toolbar-right";
    const btnChange = document.createElement("button");
    btnChange.className = "btn";
    btnChange.textContent = "Cambiar comercio";
    btnChange.addEventListener("click", () => {
      state.currentCommerceId = null;
      state.promoEditingId = null;
      saveCurrentCommerceId();
      renderApp();
    });
    topBar.appendChild(btnChange);
    container.appendChild(topBar);

    const layout = document.createElement("div");
    layout.className = "layout-two-columns";

    const left = document.createElement("div");

    const h2 = document.createElement("h2");
    h2.textContent = "Panel de " + currentCommerce.name;
    left.appendChild(h2);

    const info = document.createElement("p");
    info.className = "muted";
    info.textContent =
      "Barrio: " +
      (currentCommerce.neighborhood || "Sin especificar") +
      " · Dirección: " +
      (currentCommerce.address || "—");
    left.appendChild(info);

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    const btnNew = document.createElement("button");
    btnNew.className = "btn primary";
    btnNew.textContent = "+ Nueva promoción";
    btnNew.addEventListener("click", () => {
      state.promoEditingId = null;
      renderApp();
    });
    toolbar.appendChild(btnNew);
    left.appendChild(toolbar);

    const h3 = document.createElement("h3");
    h3.textContent = "Mis promociones";
    left.appendChild(h3);

    const grid = document.createElement("div");
    grid.className = "grid";

    const promosCommerce = state.data.promotions.filter(
      (p) => p.commerceId === currentCommerce.id
    );

    if (promosCommerce.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Todavía no creaste promociones.";
      grid.appendChild(empty);
    } else {
      promosCommerce.forEach((promo) => {
        grid.appendChild(createPromotionCard(promo, "commerce"));
      });
    }

    left.appendChild(grid);
    layout.appendChild(left);

    const right = document.createElement("div");
    right.appendChild(createPromotionForm());
    layout.appendChild(right);

    container.appendChild(layout);
  }
}

// Fallback antiguo (no usado en nuevo flujo, se mantiene por compatibilidad)
function renderCommerceLogin(container) {
  const h2 = document.createElement("h2");
  h2.textContent = "Ingresar como comercio";
  container.appendChild(h2);

  const p = document.createElement("p");
  p.className = "muted";
  p.textContent =
    "Si el comercio no existe, se creará automáticamente y quedará guardado en este navegador.";
  container.appendChild(p);

  const form = document.createElement("form");
  form.className = "form";
  form.innerHTML = `
    <label>
      Nombre del comercio
      <input name="name" required />
    </label>
    <label>
      Dirección (opcional)
      <input name="address" />
    </label>
    <label>
      Barrio (opcional)
      <input name="neighborhood" />
    </label>
    <div class="form-actions">
      <button class="btn primary" type="submit">Entrar al panel</button>
    </div>
  `;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const name = (formData.get("name") || "").toString().trim();
    const address = (formData.get("address") || "").toString().trim();
    const neighborhood = (formData.get("neighborhood") || "")
      .toString()
      .trim();

    if (!name) return;

    const existing = state.data.commerces.find((c) => {
      if (c.name.toLowerCase() !== name.toLowerCase()) return false;
      if (neighborhood) {
        return (
          (c.neighborhood || "").toLowerCase() ===
          neighborhood.toLowerCase()
        );
      }
      return true;
    });

    if (existing) {
      state.currentCommerceId = existing.id;
      saveCurrentCommerceId();
      renderApp();
      return;
    }

    const newCommerce = {
      id: uuid("com"),
      name,
      address,
      neighborhood,
      createdAt: new Date().toISOString(),
    };

    state.data.commerces.push(newCommerce);
    saveData();
    state.currentCommerceId = newCommerce.id;
    saveCurrentCommerceId();
    renderApp();
  });

  container.appendChild(form);
}

function createPromotionCard(promo, mode) {
  const remaining =
    promo.maxCoupons != null
      ? (promo.maxCoupons || 0) - (promo.redeemedCount || 0)
      : null;
  const isExpired =
    promo.validTo &&
    new Date(promo.validTo).getTime() < Date.now();

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = promo.id;

  const header = document.createElement("div");
  header.className = "card-header";

  const b1 = document.createElement("span");
  b1.className = "badge";
  b1.textContent = promo.category || "General";
  header.appendChild(b1);

  if (!promo.isActive) {
    const b2 = document.createElement("span");
    b2.className = "badge badge-muted";
    b2.textContent = "Pausada";
    header.appendChild(b2);
  }

  if (isExpired) {
    const b3 = document.createElement("span");
    b3.className = "badge badge-danger";
    b3.textContent = "Vencida";
    header.appendChild(b3);
  }

  card.appendChild(header);

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = promo.title;
  card.appendChild(title);

  if (promo.description) {
    const desc = document.createElement("p");
    desc.className = "card-text";
    desc.textContent = promo.description;
    card.appendChild(desc);
  }

  const infoCommerce = document.createElement("p");
  infoCommerce.className = "card-text small";
  infoCommerce.textContent =
    "Comercio: " +
    (promo.commerceName || "—") +
    (promo.neighborhood ? " · " + promo.neighborhood : "");
  card.appendChild(infoCommerce);

  const infoDiscount = document.createElement("p");
  infoDiscount.className = "card-text small";
  let textTipo = promo.discountType || "descuento";
  infoDiscount.textContent =
    "Tipo: " +
    textTipo +
    (promo.discountValue ? " · Valor: " + promo.discountValue : "");
  card.appendChild(infoDiscount);

  const infoCupones = document.createElement("p");
  infoCupones.className = "card-text small";
  if (promo.maxCoupons) {
    infoCupones.textContent =
      "Cupones: " + (remaining || 0) + "/" + promo.maxCoupons;
  } else {
    infoCupones.textContent = "Sin límite de cupones";
  }
  card.appendChild(infoCupones);

  if (promo.validFrom || promo.validTo) {
    const infoFecha = document.createElement("p");
    infoFecha.className = "card-text small";
    const from = promo.validFrom
      ? new Date(promo.validFrom).toLocaleDateString()
      : "—";
    const to = promo.validTo
      ? new Date(promo.validTo).toLocaleDateString()
      : "—";
    infoFecha.textContent = "Vigencia: " + from + " – " + to;
    card.appendChild(infoFecha);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (mode === "user") {
    const btnRedeem = document.createElement("button");
    btnRedeem.className = "btn primary btn-redeem";
    btnRedeem.textContent = "Marcar como canjeado";
    btnRedeem.disabled =
      !promo.isActive || isExpired || (remaining !== null && remaining <= 0);
    actions.appendChild(btnRedeem);
  } else if (mode === "commerce") {
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-edit";
    btnEdit.textContent = "Editar";
    actions.appendChild(btnEdit);

    const btnToggle = document.createElement("button");
    btnToggle.className = "btn btn-toggle";
    btnToggle.textContent = promo.isActive ? "Pausar" : "Activar";
    actions.appendChild(btnToggle);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn danger btn-delete";
    btnDelete.textContent = "Eliminar";
    actions.appendChild(btnDelete);
  }

  card.appendChild(actions);
  return card;
}

function createPromotionForm() {
  const currentCommerce = getCurrentCommerce();

  const wrapper = document.createElement("form");
  wrapper.className = "form";
  wrapper.id = "promo-form";

  const editingPromo =
    state.promoEditingId &&
    state.data.promotions.find((p) => p.id === state.promoEditingId);

  wrapper.innerHTML = `
    <h3>${editingPromo ? "Editar promoción" : "Nueva promoción"}</h3>
    <label>
      Título
      <input name="title" required />
    </label>
    <label>
      Descripción
      <textarea name="description" rows="3"></textarea>
    </label>
    <label>
      Categoría
      <select name="category">
        <option value="Gastronomía">Gastronomía</option>
        <option value="Almacén">Almacén</option>
        <option value="Belleza">Belleza</option>
        <option value="Servicios">Servicios</option>
        <option value="Otros">Otros</option>
      </select>
    </label>
    <label>
      Tipo de descuento
      <select name="discountType">
        <option value="percent">% Descuento</option>
        <option value="amount">Monto fijo</option>
        <option value="2x1">2x1</option>
        <option value="combo">Combo</option>
        <option value="happyhour">Happy Hour</option>
      </select>
    </label>
    <label>
      Valor descuento
      <input name="discountValue" placeholder="Ej: 20% o $500" />
    </label>
    <label>
      Máx. cupones (opcional)
      <input type="number" min="0" name="maxCoupons" />
    </label>
    <div class="form-row">
      <label>
        Desde
        <input type="date" name="validFrom" />
      </label>
      <label>
        Hasta
        <input type="date" name="validTo" />
      </label>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn primary">
        Guardar
      </button>
      <button type="button" class="btn" id="btn-cancel-promo" style="margin-left:0.5rem;">
        Cancelar
      </button>
    </div>
  `;

  setTimeout(() => {
    const form = wrapper;
    if (!form) return;
    if (editingPromo) {
      form.elements["title"].value = editingPromo.title || "";
      form.elements["description"].value =
        editingPromo.description || "";
      form.elements["category"].value =
        editingPromo.category || "Gastronomía";
      form.elements["discountType"].value =
        editingPromo.discountType || "percent";
      form.elements["discountValue"].value =
        editingPromo.discountValue || "";
      form.elements["maxCoupons"].value =
        editingPromo.maxCoupons != null ? editingPromo.maxCoupons : "";
      form.elements["validFrom"].value = editingPromo.validFrom || "";
      form.elements["validTo"].value = editingPromo.validTo || "";
    } else {
      form.reset();
      form.elements["category"].value = "Gastronomía";
      form.elements["discountType"].value = "percent";
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!currentCommerce) return;

      const fd = new FormData(form);
      const title = (fd.get("title") || "").toString().trim();
      if (!title) return;

      const promoData = {
        title,
        description: (fd.get("description") || "").toString().trim(),
        category: (fd.get("category") || "Gastronomía").toString(),
        discountType: (fd.get("discountType") || "percent").toString(),
        discountValue: (fd.get("discountValue") || "").toString().trim(),
        validFrom: fd.get("validFrom") || "",
        validTo: fd.get("validTo") || "",
      };

      const maxCouponsRaw = fd.get("maxCoupons");
      let maxCoupons = null;
      if (maxCouponsRaw) {
        const num = parseInt(maxCouponsRaw.toString(), 10);
        if (!isNaN(num) && num >= 0) {
          maxCoupons = num;
        }
      }

      promoData.maxCoupons = maxCoupons;

      if (editingPromo) {
        const idx = state.data.promotions.findIndex(
          (p) => p.id === editingPromo.id
        );
        if (idx >= 0) {
          const original = state.data.promotions[idx];
          state.data.promotions[idx] = {
            ...original,
            ...promoData,
          };
        }
      } else {
        const newPromo = {
          id: uuid("promo"),
          commerceId: currentCommerce.id,
          commerceName: currentCommerce.name,
          neighborhood: currentCommerce.neighborhood,
          createdAt: new Date().toISOString(),
          isActive: true,
          redeemedCount: 0,
          ...promoData,
        };
        state.data.promotions.push(newPromo);
      }

      saveData();
      state.promoEditingId = null;
      renderApp();
    });

    const btnCancel = document.getElementById("btn-cancel-promo");
    if (btnCancel) {
      btnCancel.addEventListener("click", () => {
        state.promoEditingId = null;
        renderApp();
      });
    }
  }, 0);

  return wrapper;
}

function setupGlobalEvents() {
  document.getElementById("app-main").addEventListener("click", (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;

    const card = btn.closest(".card");
    if (!card) return;
    const promoId = card.dataset.id;
    if (!promoId) return;

    const promo = state.data.promotions.find((p) => p.id === promoId);
    if (!promo) return;

    if (btn.classList.contains("btn-redeem")) {
      if (!isPromoValidForUser(promo)) return;
      promo.redeemedCount = (promo.redeemedCount || 0) + 1;
      saveData();
      renderApp();
    }

    if (btn.classList.contains("btn-edit")) {
      state.promoEditingId = promoId;
      renderApp();
    }

    if (btn.classList.contains("btn-toggle")) {
      promo.isActive = !promo.isActive;
      saveData();
      renderApp();
    }

    if (btn.classList.contains("btn-delete")) {
      if (confirm("¿Seguro que querés eliminar esta promoción?")) {
        state.data.promotions = state.data.promotions.filter(
          (p) => p.id !== promoId
        );
        saveData();
        renderApp();
      }
    }
  });
}

function init() {
  state.data = loadData();
  state.currentCommerceId = loadCurrentCommerceId();
  state.currentUserId = loadCurrentUserId();
  // Restaurar rol de sesión si hay IDs
  if (state.currentUserId) state.sessionRole = 'user';
  else if (state.currentCommerceId) state.sessionRole = 'commerce';
  setupGlobalEvents();
  renderApp();
}
document.addEventListener("DOMContentLoaded", init);
