// promotions.js
import { state, getCurrentCommerce, uuid } from './state.js';
import { saveData } from './storage.js';
import { renderApp } from './auth.js';

const discountTypeLabels = {
  percent: '% Descuento',
  amount: 'Monto fijo',
  '2x1': '2x1',
  combo: 'Combo',
  happyhour: 'Happy Hour',
  custom: 'Personalizado'
};

function formatDiscountDisplayValue(promo) {
  if (!promo || !promo.discountValue) return '';
  if (promo.discountType === 'custom') {
    return promo.discountValue.split('\n').join(' · ');
  }
  return promo.discountValue;
}

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

  // Media de la promoción (imagen o placeholder)
  const media = document.createElement('div');
  media.className = 'card-media';
  if (promo.imageUrl) {
    const img = document.createElement('img');
    img.src = promo.imageUrl;
    img.alt = promo.title || 'Imagen de la promoción';
    img.className = 'card-img';
    img.loading = 'lazy';
    media.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'card-placeholder';
    ph.textContent = (promo.category || 'Promo');
    media.appendChild(ph);
  }
  card.appendChild(media);

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

  // Descripción siempre visible
  const desc = document.createElement('p');
  desc.className = 'card-text';
  desc.textContent = 'Descripción: ' + (promo.description || '—');
  card.appendChild(desc);

  // Datos del comercio (nombre, dirección, barrio)
  const com = state.data.commerces.find(c => c.id === promo.commerceId);
  const infoCommerce = document.createElement('p');
  infoCommerce.className = 'card-text small';
  const comName = (promo.commerceName || (com ? com.name : '—'));
  const address = com && com.address ? ' · Dirección: ' + com.address : '';
  const neigh = (promo.neighborhood || (com ? com.neighborhood : '')) ? ' · Barrio: ' + (promo.neighborhood || (com ? com.neighborhood : '')) : '';
  infoCommerce.textContent = 'Comercio: ' + comName + address + neigh;
  card.appendChild(infoCommerce);

  // Tipo/valor descuento
  const infoDiscount = document.createElement('p');
  infoDiscount.className = 'card-text small';
  const textTipo = discountTypeLabels[promo.discountType] || promo.discountType || 'descuento';
  const valueText = formatDiscountDisplayValue(promo);
  infoDiscount.textContent = 'Tipo: ' + textTipo + (valueText ? ' · Valor: ' + valueText : '');
  card.appendChild(infoDiscount);

  // Estado y cupones
  const infoCupones = document.createElement('p');
  infoCupones.className = 'card-text small';
  const redeemed = promo.redeemedCount || 0;
  if (promo.maxCoupons != null && promo.maxCoupons >= 0) {
    infoCupones.textContent = 'Canjeados: ' + redeemed + ' de ' + promo.maxCoupons + (remaining !== null ? ' · Restan: ' + Math.max(0, remaining) : '');
  } else {
    infoCupones.textContent = 'Canjeados: ' + redeemed + ' · Sin límite';
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

  // Mostrar código de promoción claramente en modo comercio
  if (mode === 'commerce' && promo.promoCode) {
    const infoCode = document.createElement('p');
    infoCode.className = 'card-text small';
    infoCode.innerHTML = 'Código: <strong>' + promo.promoCode + '</strong>';
    card.appendChild(infoCode);
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
    <label>Imagen (URL opcional)
      <input name="imageUrl" placeholder="https://..." />
    </label>
    <div class="form-row" style="align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <input type="file" id="image-file" accept="image/*" style="max-width:260px;" />
      <span class="muted" style="font-size:0.8rem;">o subí una imagen (se guarda localmente). Recomendado &lt; 1MB.</span>
    </div>
    <div id="image-preview-wrap" style="display:none;margin:0.25rem 0 0.5rem;">
      <img id="image-preview" alt="Vista previa" style="max-width:100%;border-radius:0.75rem;"/>
    </div>
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
      <select name="discountType" id="discount-type">
        <option value="percent">% Descuento</option>
        <option value="amount">Monto fijo</option>
        <option value="2x1">2x1</option>
        <option value="combo">Combo</option>
        <option value="happyhour">Happy Hour</option>
        <option value="custom">Personalizado</option>
      </select>
    </label>
    <div id="discount-dynamic" class="discount-dynamic"></div>
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
    let uploadedImageDataUrl = null;
    if (editingPromo) {
      form.elements['title'].value = editingPromo.title || '';
      form.elements['description'].value = editingPromo.description || '';
      form.elements['imageUrl'].value = editingPromo.imageUrl || '';
      form.elements['category'].value = editingPromo.category || 'Gastronomía';
      form.elements['discountType'].value = editingPromo.discountType || 'percent';
      form.elements['maxCoupons'].value = editingPromo.maxCoupons != null ? editingPromo.maxCoupons : '';
      form.elements['validFrom'].value = editingPromo.validFrom || '';
      form.elements['validTo'].value = editingPromo.validTo || '';
      form.elements['promoCode'].value = editingPromo.promoCode || '';
      if (editingPromo.imageUrl) {
        const prevWrap = form.querySelector('#image-preview-wrap');
        const prev = form.querySelector('#image-preview');
        prev.src = editingPromo.imageUrl;
        prevWrap.style.display = 'block';
      }
    } else {
      form.reset();
      form.elements['category'].value = 'Gastronomía';
      form.elements['discountType'].value = 'percent';
    }

    const discountTypeSelect = form.elements['discountType'];
    const discountDynamic = form.querySelector('#discount-dynamic');
    const initialDiscountValue = editingPromo ? editingPromo.discountValue || '' : '';

    const parseNumericValue = raw => {
      if (raw == null) return null;
      const normalized = raw.toString().replace(',', '.').replace(/[^\d.]/g, '');
      if (!normalized) return null;
      const num = parseFloat(normalized);
      return Number.isNaN(num) ? null : num;
    };

    const splitCustomValue = value => {
      if (!value) return [];
      return value.split('\n').map(v => v.trim()).filter(Boolean);
    };

    function renderDiscountFields(type, prefillRaw) {
      if (!discountDynamic) return;
      discountDynamic.innerHTML = '';
      const prefill = typeof prefillRaw === 'string' ? prefillRaw : '';
      if (type === 'percent') {
        const label = document.createElement('label');
        label.textContent = 'Porcentaje de descuento';
        const input = document.createElement('input');
        input.type = 'number';
        input.name = 'discountPercent';
        input.placeholder = 'Ej: 20';
        input.min = '1';
        input.max = '100';
        input.step = '0.5';
        input.required = true;
        const numeric = parseNumericValue(prefill);
        if (numeric !== null) input.value = numeric;
        label.appendChild(input);
        discountDynamic.appendChild(label);
        return;
      }
      if (type === 'amount') {
        const label = document.createElement('label');
        label.textContent = 'Monto del descuento';
        const input = document.createElement('input');
        input.type = 'number';
        input.name = 'discountAmount';
        input.placeholder = 'Ej: 500';
        input.min = '1';
        input.step = '0.5';
        input.required = true;
        const numeric = parseNumericValue(prefill);
        if (numeric !== null) input.value = numeric;
        label.appendChild(input);
        discountDynamic.appendChild(label);
        return;
      }
      if (type === 'combo') {
        const label = document.createElement('label');
        label.textContent = 'Descripción del combo';
        const textarea = document.createElement('textarea');
        textarea.name = 'comboDescription';
        textarea.rows = 3;
        textarea.placeholder = 'Detalle qué incluye el combo';
        textarea.required = true;
        if (prefill) textarea.value = prefill;
        label.appendChild(textarea);
        discountDynamic.appendChild(label);
        return;
      }
      if (type === 'happyhour') {
        const label = document.createElement('label');
        label.textContent = 'Detalle del Happy Hour';
        const textarea = document.createElement('textarea');
        textarea.name = 'happyHourDetail';
        textarea.rows = 2;
        textarea.placeholder = 'Ej: 18 a 20 hs, 30% en tragos';
        textarea.required = true;
        if (prefill) textarea.value = prefill;
        label.appendChild(textarea);
        discountDynamic.appendChild(label);
        return;
      }
      if (type === 'custom') {
        const wrap = document.createElement('div');
        const info = document.createElement('p');
        info.className = 'muted';
        info.textContent = 'Personalizá la promo agregando los ítems que quieras destacar.';
        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'custom-items';
        itemsWrap.style.display = 'flex';
        itemsWrap.style.flexDirection = 'column';
        itemsWrap.style.gap = '0.5rem';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn';
        addBtn.textContent = 'Agregar detalle';
        addBtn.style.alignSelf = 'flex-start';
        addBtn.style.marginTop = '0.25rem';

        wrap.appendChild(info);
        wrap.appendChild(itemsWrap);
        wrap.appendChild(addBtn);
        discountDynamic.appendChild(wrap);

        const addItemRow = (value = '') => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '0.5rem';
          row.style.alignItems = 'center';
          const input = document.createElement('input');
          input.name = 'customItem[]';
          input.placeholder = 'Detalle personalizado';
          if (value) input.value = value;
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn danger';
          removeBtn.textContent = 'Quitar';
          removeBtn.addEventListener('click', () => {
            row.remove();
            if (!itemsWrap.querySelector('input')) addItemRow();
          });
          row.appendChild(input);
          row.appendChild(removeBtn);
          itemsWrap.appendChild(row);
        };

        const values = splitCustomValue(prefill);
        if (values.length) {
          values.forEach(v => addItemRow(v));
        } else {
          addItemRow();
        }

        addBtn.addEventListener('click', () => addItemRow());
        return;
      }
      if (type === '2x1') {
        const info = document.createElement('p');
        info.className = 'muted';
        info.textContent = 'La promo 2x1 no necesita datos extra.';
        discountDynamic.appendChild(info);
        return;
      }

      const fallback = document.createElement('label');
      fallback.textContent = 'Detalle del descuento';
      const input = document.createElement('input');
      input.name = 'discountGeneric';
      if (prefill) input.value = prefill;
      fallback.appendChild(input);
      discountDynamic.appendChild(fallback);
    }

    renderDiscountFields(discountTypeSelect.value, initialDiscountValue);
    discountTypeSelect.addEventListener('change', () => renderDiscountFields(discountTypeSelect.value));

    // Manejo de archivo -> Data URL para persistir junto a la promo
    const fileInput = document.getElementById('image-file');
    const prevWrap = document.getElementById('image-preview-wrap');
    const prev = document.getElementById('image-preview');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          uploadedImageDataUrl = reader.result;
          prev.src = uploadedImageDataUrl;
          prevWrap.style.display = 'block';
          // limpiar el campo URL para evitar confusión
          if (form.elements['imageUrl']) form.elements['imageUrl'].value = '';
        };
        reader.readAsDataURL(f);
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentCommerce) return;
      const fd = new FormData(form);
      const title = (fd.get('title')||'').toString().trim();
      if (!title) return;
      const discountType = (fd.get('discountType')||'percent').toString();
      let discountValue = '';
      if (discountType === 'percent') {
        const percentRaw = fd.get('discountPercent');
        const percent = parseNumericValue(percentRaw);
        if (percent === null || percent <= 0 || percent > 100) {
          alert('Ingresá un porcentaje válido (1-100).');
          return;
        }
        discountValue = percent + '%';
      } else if (discountType === 'amount') {
        const amountRaw = fd.get('discountAmount');
        const amount = parseNumericValue(amountRaw);
        if (amount === null || amount <= 0) {
          alert('Ingresá un monto válido.');
          return;
        }
        const normalizedAmount = amount.toFixed(2).replace(/\.00$/, '');
        discountValue = '$' + normalizedAmount;
      } else if (discountType === 'combo') {
        const detail = (fd.get('comboDescription')||'').toString().trim();
        if (!detail) {
          alert('Describí el combo.');
          return;
        }
        discountValue = detail;
      } else if (discountType === 'happyhour') {
        const detail = (fd.get('happyHourDetail')||'').toString().trim();
        if (!detail) {
          alert('Detallá el Happy Hour.');
          return;
        }
        discountValue = detail;
      } else if (discountType === 'custom') {
        const customItems = fd.getAll('customItem[]').map(entry => (entry || '').toString().trim()).filter(Boolean);
        if (!customItems.length) {
          alert('Agregá al menos un detalle personalizado.');
          return;
        }
        discountValue = customItems.join('\n');
      } else {
        discountValue = (fd.get('discountGeneric')||'').toString().trim();
      }
      const promoData = {
        title,
        description: (fd.get('description')||'').toString().trim(),
        imageUrl: uploadedImageDataUrl || (fd.get('imageUrl')||'').toString().trim(),
        category: (fd.get('category')||'Gastronomía').toString(),
        discountType,
        discountValue: discountValue.trim(),
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
  modal.style.zIndex='10000';
  const box = document.createElement('div');
  box.style.background='#fff';
  box.style.padding='1rem';
  box.style.borderRadius='0.75rem';
  box.style.width='min(340px,90%)';
  box.innerHTML = `<h3>Código de la promoción</h3>
    <p style="font-size:0.75rem;color:#555;margin:0 0 0.5rem 0">Mostrá este código al comercio para canjear. No requiere QR.</p>
    <div style="font-size:1.25rem;font-weight:600;letter-spacing:1px;text-align:center;margin:0.75rem 0;">${promo.promoCode || '—'}</div>
    <p style="font-size:0.7rem;color:#666;line-height:1.2;margin:0 0 0.75rem 0">${promo.description || ''}</p>
    <div style="display:flex;gap:0.5rem;justify-content:center;">
      <button class="btn" id="copy-promo-code">Copiar</button>
      <button class="btn" id="close-promo-code">Cerrar</button>
    </div>`;
  modal.appendChild(box);
  document.body.appendChild(modal);
  const closeBtn = box.querySelector('#close-promo-code');
  if (closeBtn) closeBtn.addEventListener('click', ()=>modal.remove());
  const copyBtn = box.querySelector('#copy-promo-code');
  if (copyBtn) copyBtn.addEventListener('click', async ()=>{
    try { await navigator.clipboard.writeText(promo.promoCode || ''); copyBtn.textContent='Copiado'; setTimeout(()=>copyBtn.textContent='Copiar', 1200); } catch(_) {}
  });
  modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function escHandler(ev){ if (ev.key==='Escape'){ modal.remove(); document.removeEventListener('keydown', escHandler); } });
}
