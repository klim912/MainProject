// ЗМІНИ:
// - Повне очищення колекцій (get() + batch delete) перед записом нових
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

router.post('/wishlist', async (req, res) => {
  const { uid, items } = req.body;
  if (!uid || !items) return res.status(400).json({ error: 'Missing fields' });
  try {
    const wishRef = db.collection('userWishlists').doc(uid).collection('items');
    const oldDocs = await wishRef.get();
    const batch = db.batch();
    oldDocs.docs.forEach(doc => batch.delete(doc.ref));
    items.forEach(item => batch.set(wishRef.doc(item.dealID), item));
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Update wishlist error:', err);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

module.exports = router;