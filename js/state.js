// state.js
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
  uiView: 'default', // 'default' | 'profile'
  mapState: {
    userPos: null, // { lat, lng }
    radiusKm: 1,
    selectedCommerceId: null, // comercio seleccionado desde el mapa
    mapOpen: false // panel de mapa desplegable en vista usuario
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
