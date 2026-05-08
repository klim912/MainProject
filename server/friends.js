// ЗМІНИ:
// - Додано profile/:uid, messages/new, online
// - unreadCount у GET /:uid за параметром ?lastChecked
// - Порядок маршрутів: конкретні перед параметризованим
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Пошук користувачів
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const queryLower = q.toLowerCase();
    const usersRef = db.collection('users');
    const nameSnapshot = await usersRef.where('displayName', '>=', queryLower).where('displayName', '<=', queryLower + '\uf8ff').limit(10).get();
    const emailSnapshot = await usersRef.where('email', '>=', queryLower).where('email', '<=', queryLower + '\uf8ff').limit(10).get();
    const users = [];
    nameSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({ uid: doc.id, displayName: data.displayName, avatar: data.avatar, email: data.email });
    });
    emailSnapshot.forEach(doc => {
      const data = doc.data();
      if (!users.find(u => u.uid === doc.id)) {
        users.push({ uid: doc.id, displayName: data.displayName, avatar: data.avatar, email: data.email });
      }
    });
    res.json(users);
  } catch (err) {
    console.error('Friends search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Надіслати запит дружби
router.post('/request', async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;
    if (!fromUid || !toUid || fromUid === toUid) return res.status(400).json({ error: 'Invalid request' });
    const existingRequest = await db.collection('friendRequests').where('from', '==', fromUid).where('to', '==', toUid).where('status', '==', 'pending').get();
    if (!existingRequest.empty) return res.status(400).json({ error: 'Request already sent' });
    const existingFriend = await db.collection('friends').where('users', 'array-contains', fromUid).get();
    const alreadyFriends = existingFriend.docs.some(doc => doc.data().users.includes(toUid));
    if (alreadyFriends) return res.status(400).json({ error: 'Already friends' });
    await db.collection('friendRequests').add({
      from: fromUid,
      to: toUid,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Вхідні запити
router.get('/requests/incoming/:uid', async (req, res) => {
  try {
    const snapshot = await db.collection('friendRequests').where('to', '==', req.params.uid).where('status', '==', 'pending').get();
    const requests = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fromUser = await db.collection('users').doc(data.from).get();
      requests.push({
        id: doc.id,
        from: data.from,
        fromName: fromUser.exists ? fromUser.data().displayName : 'Unknown',
        fromAvatar: fromUser.exists ? fromUser.data().avatar : null,
        createdAt: data.createdAt?.toDate() || null
      });
    }
    res.json(requests);
  } catch (err) {
    console.error('Get incoming requests error:', err);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Вихідні запити
router.get('/requests/outgoing/:uid', async (req, res) => {
  try {
    const snapshot = await db.collection('friendRequests').where('from', '==', req.params.uid).where('status', '==', 'pending').get();
    const requests = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const toUser = await db.collection('users').doc(data.to).get();
      requests.push({
        id: doc.id,
        to: data.to,
        toName: toUser.exists ? toUser.data().displayName : 'Unknown',
        toAvatar: toUser.exists ? toUser.data().avatar : null,
        createdAt: data.createdAt?.toDate() || null
      });
    }
    res.json(requests);
  } catch (err) {
    console.error('Get outgoing requests error:', err);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Прийняти запит
router.post('/accept', async (req, res) => {
  try {
    const { requestId, uid } = req.body;
    const requestDoc = await db.collection('friendRequests').doc(requestId).get();
    if (!requestDoc.exists || requestDoc.data().to !== uid) return res.status(403).json({ error: 'Not authorized' });
    const { from, to } = requestDoc.data();
    await db.collection('friends').add({ users: [from, to], since: admin.firestore.FieldValue.serverTimestamp() });
    await requestDoc.ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Accept friend request error:', err);
    res.status(500).json({ error: 'Failed to accept' });
  }
});

// Відхилити запит
router.post('/decline', async (req, res) => {
  try {
    const { requestId, uid } = req.body;
    const requestDoc = await db.collection('friendRequests').doc(requestId).get();
    if (!requestDoc.exists || requestDoc.data().to !== uid) return res.status(403).json({ error: 'Not authorized' });
    await requestDoc.ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Decline friend request error:', err);
    res.status(500).json({ error: 'Failed to decline' });
  }
});

// Видалити друга
router.post('/remove', async (req, res) => {
  try {
    const { uid, friendUid } = req.body;
    const snapshot = await db.collection('friends').where('users', 'array-contains', uid).get();
    const friendshipDoc = snapshot.docs.find(doc => doc.data().users.includes(friendUid));
    if (!friendshipDoc) return res.status(404).json({ error: 'Friendship not found' });
    await friendshipDoc.ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Failed to remove' });
  }
});

// Оновити онлайн статус
router.post('/online/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { online } = req.body;
    await db.collection('users').doc(uid).update({ online });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update online status' });
  }
});

// Профіль користувача (для перегляду друзями)
router.get('/profile/:uid', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const userData = userDoc.data();
    res.json({
      uid: req.params.uid,
      displayName: userData.displayName,
      avatar: userData.avatar,
      email: userData.email,
      online: userData.online || false,
    });
  } catch (err) {
    console.error('Get friend profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Отримати повідомлення між двома користувачами
router.get('/messages/:uid1/:uid2', async (req, res) => {
  try {
    const { uid1, uid2 } = req.params;
    const snapshot = await db.collection('messages').where('participants', 'array-contains', uid1).get();
    const messages = [];
    snapshot.forEach(doc => {
      const msg = doc.data();
      if (msg.participants.includes(uid2)) {
        messages.push({
          id: doc.id,
          from: msg.from,
          to: msg.to,
          text: msg.text,
          fromName: msg.fromName,
          timestamp: msg.timestamp?.toDate() || null
        });
      }
    });
    messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Надіслати повідомлення (з ім'ям відправника)
router.post('/messages', async (req, res) => {
  try {
    const { from, to, text } = req.body;
    if (!from || !to || !text) return res.status(400).json({ error: 'Missing fields' });
    const fromUser = await db.collection('users').doc(from).get();
    const fromName = fromUser.exists ? fromUser.data().displayName : 'Unknown';
    await db.collection('messages').add({
      from,
      to,
      text,
      fromName,
      participants: [from, to],
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Нові повідомлення (для ручного оновлення)
router.get('/messages/new/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(0);
    const snapshot = await db.collection('messages')
      .where('participants', 'array-contains', uid)
      .where('timestamp', '>', admin.firestore.Timestamp.fromDate(since))
      .get();
    const newMessages = [];
    snapshot.forEach(doc => {
      const msg = doc.data();
      if (msg.from !== uid) {
        newMessages.push({
          from: msg.from,
          fromName: msg.fromName || msg.from,
          text: msg.text,
          timestamp: msg.timestamp.toDate().toISOString()
        });
      }
    });
    res.json(newMessages);
  } catch (err) {
    console.error('Get new messages error:', err);
    res.status(500).json({ error: 'Failed to get new messages' });
  }
});

// Список друзів (з онлайн статусом та unreadCount при передачі lastChecked)
router.get('/:uid', async (req, res) => {
  try {
    const snapshot = await db.collection('friends')
      .where('users', 'array-contains', req.params.uid)
      .get();
    const friends = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const friendUid = data.users.find(u => u !== req.params.uid);
      const friendDoc = await db.collection('users').doc(friendUid).get();
      if (friendDoc.exists) {
        const friendData = friendDoc.data();
        friends.push({
          id: doc.id,
          uid: friendUid,
          displayName: friendData.displayName,
          avatar: friendData.avatar,
          online: friendData.online || false,
          since: data.since?.toDate() || null,
          unreadCount: 0
        });
      }
    }

    const lastChecked = req.query.lastChecked;
    if (lastChecked) {
      const sinceDate = new Date(lastChecked);
      if (!isNaN(sinceDate.getTime())) {
        const messagesSnap = await db.collection('messages')
          .where('participants', 'array-contains', req.params.uid)
          .where('timestamp', '>', admin.firestore.Timestamp.fromDate(sinceDate))
          .get();
        const countMap = {};
        messagesSnap.forEach(doc => {
          const msg = doc.data();
          if (msg.from !== req.params.uid) {
            countMap[msg.from] = (countMap[msg.from] || 0) + 1;
          }
        });
        friends.forEach(f => {
          f.unreadCount = countMap[f.uid] || 0;
        });
      }
    }

    res.json(friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

module.exports = router;