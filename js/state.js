// state.js
export const STORAGE_KEY = "vecinapp-data-v1";
export const STORAGE_COMMERCE_ID_KEY = "vecinapp-current-commerce-id";
export const STORAGE_USER_ID_KEY = "vecinapp-current-user-id";

export const state = {
  sessionRole: null,
  data: {
    commerces: [],
    promotions: [],
    users: []
  },
  currentCommerceId: null,
  currentUserId: null,
  promoEditingId: null,
  mapState: {
    userPos: null, // { lat, lng }
    radiusKm: 1,
    selectedCommerceId: null // comercio seleccionado desde el mapa
  }
};

export function uuid(prefix) {
  return (
    (prefix || "id") + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000)
  );
}

export function getCurrentCommerce() {
  return state.data.commerces.find(c => c.id === state.currentCommerceId) || null;
}

export function getCurrentUser() {
  return state.data.users.find(u => u.id === state.currentUserId) || null;
}
