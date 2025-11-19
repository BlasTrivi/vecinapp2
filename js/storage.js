// storage.js
import { state } from './state.js';

const API_BASE = window.VECINAPP_API_BASE || '';

export async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/api/state`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Estado HTTP ${res.status}`);
    const payload = await res.json();
    return {
      commerces: Array.isArray(payload.commerces) ? payload.commerces : [],
      promotions: Array.isArray(payload.promotions) ? payload.promotions : [],
      users: Array.isArray(payload.users) ? payload.users : []
    };
  } catch (error) {
    console.error('No se pudieron obtener los datos remotos', error);
    return { commerces: [], promotions: [], users: [] };
  }
}

export function saveData() {
  fetch(`${API_BASE}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.data)
  }).catch((error) => console.error('No se pudieron guardar los datos', error));
}

export function loadCurrentCommerceId() {
  return null;
}

export function loadCurrentUserId() {
  return null;
}

export function saveCurrentCommerceId() {
  /* persistencia deshabilitada para evitar almacenamiento local */
}

export function saveCurrentUserId() {
  /* persistencia deshabilitada para evitar almacenamiento local */
}
