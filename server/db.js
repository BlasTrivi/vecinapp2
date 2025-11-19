const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createStore(filename) {
  return Datastore.create({
    filename: path.join(dataDir, filename),
    autoload: true,
    timestampData: false
  });
}

const usersStore = createStore('users.db');
const commercesStore = createStore('commerces.db');
const promotionsStore = createStore('promotions.db');

module.exports = {
  usersStore,
  commercesStore,
  promotionsStore
};
