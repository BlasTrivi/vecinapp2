const path = require('path');
const express = require('express');
const cors = require('cors');
const { usersStore, commercesStore, promotionsStore } = require('./db');

const app = express();
const PORT = process.env.PORT || 4173;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/state', async (req, res) => {
  try {
    const [users, commerces, promotions] = await Promise.all([
      usersStore.find({}),
      commercesStore.find({}),
      promotionsStore.find({})
    ]);
    res.json({ users, commerces, promotions });
  } catch (error) {
    console.error('Error reading state', error);
    res.status(500).json({ ok: false, message: 'No se pudo leer la base de datos' });
  }
});

app.post('/api/state', async (req, res) => {
  const payload = req.body || {};
  const users = Array.isArray(payload.users) ? payload.users : [];
  const commerces = Array.isArray(payload.commerces) ? payload.commerces : [];
  const promotions = Array.isArray(payload.promotions) ? payload.promotions : [];

  try {
    await Promise.all([
      usersStore.remove({}, { multi: true }),
      commercesStore.remove({}, { multi: true }),
      promotionsStore.remove({}, { multi: true })
    ]);

    if (users.length) await usersStore.insert(users);
    if (commerces.length) await commercesStore.insert(commerces);
    if (promotions.length) await promotionsStore.insert(promotions);

    res.json({ ok: true, counts: { users: users.length, commerces: commerces.length, promotions: promotions.length } });
  } catch (error) {
    console.error('Error saving state', error);
    res.status(500).json({ ok: false, message: 'No se pudo guardar la base de datos' });
  }
});

const clientDir = path.resolve(__dirname, '..');
app.use(express.static(clientDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VecinAPP listo en http://localhost:${PORT}`);
});
