// promotions.js
import { state, getCurrentCommerce, uuid } from './state.js';
import { saveData } from './storage.js';
import { renderApp } from './auth.js';

export function isPromoValidForUser(promo) {
  if (!promo.isActive) return false;
  const now = Date.now();
  if (promo.validTo) {
    const end = new Date(promo.validTo).getTime();
    if (end && end < now) return false;
  }
  if (promo.maxCoupons && (promo.redeemedCount || 0) >= promo.maxCoupons) return false;
  return true;
}
// Nuevo: canje por código definido por el comercio en la promoción (promo.promoCode)
export function redeemPromotionCode(code) {
  if (!code) return { ok:false, message:'Código vacío' };
  const promo = state.data.promotions.find(p => p.promoCode && p.promoCode.toLowerCase() === code.toLowerCase());
  if (!promo) return { ok:false, message:'Código no encontrado' };
  if (!isPromoValidForUser(promo)) return { ok:false, message:'Promoción no válida' };
  promo.redeemedCount = (promo.redeemedCount || 0) + 1;
  saveData();
  return { ok:true, promo };
}

export function createPromotionCard(promo, mode) {
  const remaining = promo.maxCoupons != null ? (promo.maxCoupons || 0) - (promo.redeemedCount || 0) : null;
  const isExpired = promo.validTo && new Date(promo.validTo).getTime() < Date.now();
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = promo.id;

  const header = document.createElement('div');
  header.className = 'card-header';
  const b1 = document.createElement('span');
  b1.className = 'badge';
  b1.textContent = promo.category || 'General';
  header.appendChild(b1);
  if (!promo.isActive) {
    const b2 = document.createElement('span');
    b2.className = 'badge badge-muted';
    b2.textContent = 'Pausada';
    header.appendChild(b2);
  }
  if (isExpired) {
    const b3 = document.createElement('span');
    b3.className = 'badge badge-danger';
    b3.textContent = 'Vencida';
    header.appendChild(b3);
  }
  card.appendChild(header);

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = promo.title;
  card.appendChild(title);

  if (promo.description) {
    const desc = document.createElement('p');
    desc.className = 'card-text';
    desc.textContent = promo.description;
    card.appendChild(desc);
  }

  const infoCommerce = document.createElement('p');
  infoCommerce.className = 'card-text small';
  infoCommerce.textContent = 'Comercio: ' + (promo.commerceName || '—') + (promo.neighborhood ? ' · ' + promo.neighborhood : '');
  card.appendChild(infoCommerce);

  const infoDiscount = document.createElement('p');
  infoDiscount.className = 'card-text small';
  let textTipo = promo.discountType || 'descuento';
  infoDiscount.textContent = 'Tipo: ' + textTipo + (promo.discountValue ? ' · Valor: ' + promo.discountValue : '');
  card.appendChild(infoDiscount);

  const infoCupones = document.createElement('p');
  infoCupones.className = 'card-text small';
  if (promo.maxCoupons) {
    infoCupones.textContent = 'Cupones: ' + (remaining || 0) + '/' + promo.maxCoupons;
  } else {
    infoCupones.textContent = 'Sin límite de cupones';
  }
  card.appendChild(infoCupones);

  if (promo.validFrom || promo.validTo) {
    const infoFecha = document.createElement('p');
    infoFecha.className = 'card-text small';
    const from = promo.validFrom ? new Date(promo.validFrom).toLocaleDateString() : '—';
    const to = promo.validTo ? new Date(promo.validTo).toLocaleDateString() : '—';
    infoFecha.textContent = 'Vigencia: ' + from + ' – ' + to;
    card.appendChild(infoFecha);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  if (mode === 'user') {
    const btnShowCode = document.createElement('button');
    btnShowCode.className = 'btn';
    btnShowCode.textContent = 'Ver código';
    btnShowCode.dataset.showCode = promo.id;
    btnShowCode.disabled = !promo.isActive || isExpired || (remaining !== null && remaining <= 0);
    actions.appendChild(btnShowCode);
  } else if (mode === 'commerce') {
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-edit';
    btnEdit.textContent = 'Editar';
    actions.appendChild(btnEdit);
    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn btn-toggle';
    btnToggle.textContent = promo.isActive ? 'Pausar' : 'Activar';
    actions.appendChild(btnToggle);
    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn danger btn-delete';
    btnDelete.textContent = 'Eliminar';
    actions.appendChild(btnDelete);
  }
  card.appendChild(actions);
  return card;
}

export function createPromotionForm() {
  const currentCommerce = getCurrentCommerce();
  const wrapper = document.createElement('form');
  wrapper.className = 'form';
  wrapper.id = 'promo-form';
  const editingPromo = state.promoEditingId && state.data.promotions.find(p => p.id === state.promoEditingId);
  wrapper.innerHTML = `
    <h3>${editingPromo ? 'Editar promoción' : 'Nueva promoción'}</h3>
    <label>Título
      <input name="title" required />
    </label>
    <label>Descripción
      <textarea name="description" rows="3"></textarea>
    </label>
    <label>Categoría
      <select name="category">
        <option value="Gastronomía">Gastronomía</option>
        <option value="Almacén">Almacén</option>
        <option value="Belleza">Belleza</option>
        <option value="Servicios">Servicios</option>
        <option value="Otros">Otros</option>
      </select>
    </label>
    <label>Tipo de descuento
      <select name="discountType">
        <option value="percent">% Descuento</option>
        <option value="amount">Monto fijo</option>
        <option value="2x1">2x1</option>
        <option value="combo">Combo</option>
        <option value="happyhour">Happy Hour</option>
      </select>
    </label>
    <label>Valor descuento
      <input name="discountValue" placeholder="Ej: 20% o $500" />
    </label>
    <label>Código para canje (visible al cliente)
      <input name="promoCode" placeholder="Ej: VERANO10" required />
    </label>
    <label>Máx. cupones (opcional)
      <input type="number" min="0" name="maxCoupons" />
    </label>
    <div class="form-row">
      <label>Desde
        <input type="date" name="validFrom" />
      </label>
      <label>Hasta
        <input type="date" name="validTo" />
      </label>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn primary">Guardar</button>
      <button type="button" class="btn" id="btn-cancel-promo" style="margin-left:0.5rem;">Cancelar</button>
    </div>
  `;

  setTimeout(() => {
    const form = wrapper;
    if (!form) return;
    if (editingPromo) {
      form.elements['title'].value = editingPromo.title || '';
      form.elements['description'].value = editingPromo.description || '';
      form.elements['category'].value = editingPromo.category || 'Gastronomía';
      form.elements['discountType'].value = editingPromo.discountType || 'percent';
      form.elements['discountValue'].value = editingPromo.discountValue || '';
      form.elements['maxCoupons'].value = editingPromo.maxCoupons != null ? editingPromo.maxCoupons : '';
      form.elements['validFrom'].value = editingPromo.validFrom || '';
      form.elements['validTo'].value = editingPromo.validTo || '';
      form.elements['promoCode'].value = editingPromo.promoCode || '';
    } else {
      form.reset();
      form.elements['category'].value = 'Gastronomía';
      form.elements['discountType'].value = 'percent';
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentCommerce) return;
      const fd = new FormData(form);
      const title = (fd.get('title')||'').toString().trim();
      if (!title) return;
      const promoData = {
        title,
        description: (fd.get('description')||'').toString().trim(),
        category: (fd.get('category')||'Gastronomía').toString(),
        discountType: (fd.get('discountType')||'percent').toString(),
        discountValue: (fd.get('discountValue')||'').toString().trim(),
        validFrom: fd.get('validFrom') || '',
        validTo: fd.get('validTo') || '',
        promoCode: (fd.get('promoCode')||'').toString().trim()
      };
      const maxCouponsRaw = fd.get('maxCoupons');
      let maxCoupons = null;
      if (maxCouponsRaw) {
        const num = parseInt(maxCouponsRaw.toString(),10);
        if (!isNaN(num) && num >=0) maxCoupons = num;
      }
      promoData.maxCoupons = maxCoupons;
      if (editingPromo) {
        const idx = state.data.promotions.findIndex(p=>p.id===editingPromo.id);
        if (idx>=0) state.data.promotions[idx] = { ...state.data.promotions[idx], ...promoData };
      } else {
        const newPromo = { id: uuid('promo'), commerceId: currentCommerce.id, commerceName: currentCommerce.name, neighborhood: currentCommerce.neighborhood, createdAt: new Date().toISOString(), isActive: true, redeemedCount:0, ...promoData };
        state.data.promotions.push(newPromo);
      }
      saveData();
      state.promoEditingId = null;
      renderApp();
    });

    const btnCancel = document.getElementById('btn-cancel-promo');
    if (btnCancel) btnCancel.addEventListener('click', () => { state.promoEditingId = null; renderApp(); });
  },0);

  return wrapper;
}

export function promotionGlobalClickHandler(e) {
  const btn = e.target;
  if (!(btn instanceof HTMLElement)) return;
  const card = btn.closest('.card');
  if (!card) return;
  const promoId = card.dataset.id;
  if (!promoId) return;
  const promo = state.data.promotions.find(p=>p.id===promoId);
  if (!promo) return;
  if (btn.dataset.showCode) {
    showPromoCodeModal(promo);
  }
  if (btn.classList.contains('btn-edit')) { state.promoEditingId = promoId; renderApp(); }
  if (btn.classList.contains('btn-toggle')) { promo.isActive = !promo.isActive; saveData(); renderApp(); }
  if (btn.classList.contains('btn-delete')) {
    if (confirm('¿Seguro que querés eliminar esta promoción?')) {
      state.data.promotions = state.data.promotions.filter(p=>p.id!==promoId);
      saveData();
      renderApp();
    }
  }
}

function showPromoCodeModal(promo) {
  const existing = document.getElementById('promo-code-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'promo-code-modal';
  modal.style.position='fixed';
  modal.style.inset='0';
  modal.style.background='rgba(0,0,0,0.6)';
  modal.style.display='flex';
  modal.style.alignItems='center';
  modal.style.justifyContent='center';
  const box = document.createElement('div');
  box.style.background='#fff';
  box.style.padding='1rem';
  box.style.borderRadius='0.75rem';
  box.style.width='min(340px,90%)';
  box.innerHTML = `<h3>Código de la promoción</h3>
    <p style="font-size:0.75rem;color:#555;margin:0 0 0.5rem 0">Mostrá este código al comercio para canjear. No requiere QR.</p>
    <div style="font-size:1.25rem;font-weight:600;letter-spacing:1px;text-align:center;margin:0.75rem 0;">${promo.promoCode || '—'}</div>
    <p style="font-size:0.7rem;color:#666;line-height:1.2;margin:0 0 0.75rem 0">${promo.description || ''}</p>
    <button class="btn" id="close-promo-code">Cerrar</button>`;
  modal.appendChild(box);
  document.body.appendChild(modal);
  const closeBtn = box.querySelector('#close-promo-code');
  closeBtn.addEventListener('click', ()=>modal.remove());
}
