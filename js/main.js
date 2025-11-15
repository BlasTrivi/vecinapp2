// main.js (entrypoint ES modules)
import { state } from './state.js';
import { loadData, loadCurrentCommerceId, loadCurrentUserId, saveCurrentCommerceId, saveCurrentUserId } from './storage.js';
import { renderApp } from './auth.js';
import { promotionGlobalClickHandler } from './promotions.js';

function init() {
  state.data = loadData();
  state.currentCommerceId = loadCurrentCommerceId();
  state.currentUserId = loadCurrentUserId();
  if (state.currentUserId) state.sessionRole = 'user';
  else if (state.currentCommerceId) state.sessionRole = 'commerce';
  document.getElementById('app-main').addEventListener('click', promotionGlobalClickHandler);
  document.addEventListener('rerender-app', () => renderApp());
  document.addEventListener('clear-commerce', () => { saveCurrentCommerceId(); renderApp(); });
  renderApp();
}

document.addEventListener('DOMContentLoaded', init);
