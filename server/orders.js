const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const db = admin.firestore();

router.post('/', async (req, res) => {
  try {
    const { uid, items } = req.body;
    if (!uid || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const balance = userData.balance || 100;

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.salePrice), 0).toFixed(2);
    if (balance < parseFloat(totalAmount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const libRef = db.collection('userLibraries').doc(uid).collection('items');
    const existingDocs = await libRef.get();
    const existingDealIDs = new Set();
    existingDocs.forEach(doc => existingDealIDs.add(doc.id));

    const alreadyOwned = items.filter(item => existingDealIDs.has(item.dealID));
    if (alreadyOwned.length > 0) {
      const titles = alreadyOwned.map(i => i.title).join(', ');
      return res.status(400).json({ error: `Already in library: ${titles}` });
    }

    const newBalance = (balance - parseFloat(totalAmount)).toFixed(2);
    const orderId = 'ORDER-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const purchaseDate = new Date().toISOString();

    const libraryItems = items.map(item => {
      const activationKey = crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-');
      return {
        title: item.title,
        dealID: item.dealID,
        purchaseDate,
        orderId,
        thumb: item.thumb || '',
        activationKey
      };
    });

    const batch = db.batch();
    for (const libItem of libraryItems) {
      batch.set(libRef.doc(libItem.dealID), libItem);
    }

    const receipt = {
      orderId,
      games: libraryItems.map(item => ({
        title: item.title,
        price: parseFloat(items.find(i => i.dealID === item.dealID)?.salePrice || '0').toFixed(2),
        quantity: 1,
        activationKey: item.activationKey
      })),
      date: purchaseDate,
      amount: totalAmount,
      paymentMethod: 'Balance'
    };
    batch.set(db.collection('receipts').doc(orderId), receipt);
    batch.update(userRef, { balance: parseFloat(newBalance) });

    await batch.commit();

    res.json({
      success: true,
      orderId,
      newBalance: parseFloat(newBalance),
      amount: totalAmount,
      libraryItems,
      receipt
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;