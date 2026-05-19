const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

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
  try {
    const { uid, game } = req.body;
    if (!uid || !game || !game.dealID) return res.status(400).json({ error: 'Missing fields' });
    await db.collection('userWishlists').doc(uid).collection('items').doc(game.dealID).set(game);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.post('/wishlist/remove', async (req, res) => {
  try {
    const { uid, dealID } = req.body;
    if (!uid || !dealID) return res.status(400).json({ error: 'Missing fields' });
    await db.collection('userWishlists').doc(uid).collection('items').doc(dealID).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

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

module.exports = router;