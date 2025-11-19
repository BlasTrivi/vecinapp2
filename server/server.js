require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 4173;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const toIso = (value) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  acceptedTerms: !!row.accepted_terms,
  createdAt: toIso(row.created_at)
});

const mapCommerce = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  email: row.email,
  password: row.password,
  address: row.address,
  neighborhood: row.neighborhood,
  lat: row.lat,
  lng: row.lng,
  acceptedTerms: !!row.accepted_terms,
  createdAt: toIso(row.created_at)
});

const mapPromotion = (row) => ({
  id: row.id,
  commerceId: row.commerce_id,
  commerceName: row.commerce_name,
  neighborhood: row.neighborhood,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  category: row.category,
  discountType: row.discount_type,
  discountValue: row.discount_value,
  validFrom: row.valid_from || '',
  validTo: row.valid_to || '',
  promoCode: row.promo_code,
  maxCoupons: row.max_coupons != null ? row.max_coupons : null,
  redeemedCount: row.redeemed_count || 0,
  isActive: !!row.is_active,
  createdAt: toIso(row.created_at)
});

app.get('/api/state', async (req, res) => {
  try {
    const [usersResult, commercesResult, promotionsResult] = await Promise.all([
      pool.query('SELECT * FROM users ORDER BY created_at NULLS LAST, id'),
      pool.query('SELECT * FROM commerces ORDER BY created_at NULLS LAST, id'),
      pool.query('SELECT * FROM promotions ORDER BY created_at NULLS LAST, id')
    ]);
    res.json({
      users: usersResult.rows.map(mapUser),
      commerces: commercesResult.rows.map(mapCommerce),
      promotions: promotionsResult.rows.map(mapPromotion)
    });
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM promotions');
    await client.query('DELETE FROM commerces');
    await client.query('DELETE FROM users');

    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password, accepted_terms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          user.name,
          user.email,
          user.password,
          user.acceptedTerms ? true : false,
          user.createdAt || null
        ]
      );
    }

    for (const commerce of commerces) {
      await client.query(
        `INSERT INTO commerces (id, name, category, email, password, address, neighborhood, lat, lng, accepted_terms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          commerce.id,
          commerce.name,
          commerce.category,
          commerce.email,
          commerce.password,
          commerce.address,
          commerce.neighborhood,
          commerce.lat != null ? commerce.lat : null,
          commerce.lng != null ? commerce.lng : null,
          commerce.acceptedTerms ? true : false,
          commerce.createdAt || null
        ]
      );
    }

    for (const promo of promotions) {
      await client.query(
        `INSERT INTO promotions (
          id, commerce_id, commerce_name, neighborhood, title, description, image_url,
          category, discount_type, discount_value, valid_from, valid_to, promo_code,
          max_coupons, redeemed_count, is_active, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )`,
        [
          promo.id,
          promo.commerceId,
          promo.commerceName,
          promo.neighborhood,
          promo.title,
          promo.description,
          promo.imageUrl,
          promo.category,
          promo.discountType,
          promo.discountValue,
          promo.validFrom || null,
          promo.validTo || null,
          promo.promoCode,
          promo.maxCoupons != null ? promo.maxCoupons : null,
          promo.redeemedCount || 0,
          promo.isActive === false ? false : true,
          promo.createdAt || null
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, counts: { users: users.length, commerces: commerces.length, promotions: promotions.length } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving state', error);
    res.status(500).json({ ok: false, message: 'No se pudo guardar la base de datos' });
  } finally {
    client.release();
  }
});

const clientDir = path.resolve(__dirname, '..');
app.use(express.static(clientDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`VecinAPP listo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo inicializar la base de datos', err);
    process.exit(1);
  });
