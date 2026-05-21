// ЗМІНИ:
// - Додано GET /balance/:uid (рядки ~120-135)
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Бібліотека
router.get('/library/:uid', async (req, res) => {
  try {
    const snapshot = await db.collection('userLibraries').doc(req.params.uid).collection('items').get();
    const games = [];
    snapshot.forEach(doc => games.push({ dealID: doc.id, ...doc.data() }));
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get library' });
  }
});

router.post('/library', async (req, res) => {
  const { uid, items } = req.body;
  if (!uid || !items) return res.status(400).json({ error: 'Missing fields' });
  try {
    const libRef = db.collection('userLibraries').doc(uid).collection('items');
    const oldDocs = await libRef.get();
    const batch = db.batch();
    oldDocs.docs.forEach(doc => batch.delete(doc.ref));
    items.forEach(item => batch.set(libRef.doc(item.dealID), item));
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Update library error:', err);
    res.status(500).json({ error: 'Failed to update library' });
  }
});

// Вішліст
router.get('/wishlist/:uid', async (req, res) => {
  try {
    const snapshot = await db.collection('userWishlists').doc(req.params.uid).collection('items').get();
    const games = [];
    snapshot.forEach(doc => games.push({ dealID: doc.id, ...doc.data() }));
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get wishlist' });
  }
});

router.post('/wishlist/add', async (req, res) => {
  const { uid, game } = req.body;
  if (!uid || !game || !game.dealID) return res.status(400).json({ error: 'Missing fields' });
  try {
    await db.collection('userWishlists').doc(uid).collection('items').doc(game.dealID).set(game);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.post('/wishlist/remove', async (req, res) => {
  const { uid, dealID } = req.body;
  if (!uid || !dealID) return res.status(400).json({ error: 'Missing fields' });
  try {
    await db.collection('userWishlists').doc(uid).collection('items').doc(dealID).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Баланс користувача
router.get('/balance/:uid', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const balance = userDoc.data().balance || 100;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Очищення бібліотеки
router.delete('/library/:uid', async (req, res) => {
  try {
    const libRef = db.collection('userLibraries').doc(req.params.uid).collection('items');
    const oldDocs = await libRef.get();
    const batch = db.batch();
    oldDocs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear library' });
  }
});

// Перевірка існування користувача за email
router.get('/exists/:email', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('email', '==', req.params.email)
      .limit(1)
      .get();
    res.json({ exists: !snapshot.empty });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check user existence' });
  }
});

module.exports = router;