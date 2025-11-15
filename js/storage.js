// storage.js
import { STORAGE_KEY, STORAGE_COMMERCE_ID_KEY, STORAGE_USER_ID_KEY, state } from './state.js';

export function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { commerces: [], promotions: [], users: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      commerces: Array.isArray(parsed.commerces) ? parsed.commerces : [],
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : [],
      users: Array.isArray(parsed.users) ? parsed.users : []
    };
  } catch (e) {
    console.error('Error loading data', e);
    return { commerces: [], promotions: [], users: [] };
  }
}

export function saveData() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (e) {
    console.error('Error saving data', e);
  }
}

export function loadCurrentCommerceId() {
  const id = window.localStorage.getItem(STORAGE_COMMERCE_ID_KEY);
  return id || null;
}
export function loadCurrentUserId() {
  const id = window.localStorage.getItem(STORAGE_USER_ID_KEY);
  return id || null;
}

export function saveCurrentCommerceId() {
  if (state.currentCommerceId) {
    window.localStorage.setItem(STORAGE_COMMERCE_ID_KEY, state.currentCommerceId);
  } else {
    window.localStorage.removeItem(STORAGE_COMMERCE_ID_KEY);
  }
}
export function saveCurrentUserId() {
  if (state.currentUserId) {
    window.localStorage.setItem(STORAGE_USER_ID_KEY, state.currentUserId);
  } else {
    window.localStorage.removeItem(STORAGE_USER_ID_KEY);
  }
}
