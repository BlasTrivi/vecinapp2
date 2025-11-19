// main.js (entrypoint ES modules)
import { state } from './state.js';
import { loadData } from './storage.js';
import { renderApp } from './auth.js';
import { promotionGlobalClickHandler } from './promotions.js';
import { initTermsModal } from './terms.js';

async function init() {
  const mainEl = document.getElementById('app-main');
  if (mainEl) {
    mainEl.innerHTML = '<p class="muted">Cargando datos del servidor…</p>';
  }
  state.data = await loadData();
  if (mainEl) {
    mainEl.addEventListener('click', promotionGlobalClickHandler);
  }
  initTermsModal();
  document.addEventListener('rerender-app', () => renderApp());
  document.addEventListener('clear-commerce', () => renderApp());
  renderApp();
}

document.addEventListener('DOMContentLoaded', init);
