// ЗМІНИ:
// - Додано маршрути: GET /:reviewId/comments, POST /:reviewId/comments, DELETE /comments/:commentId
// - Додано валідацію довжини тексту (review <=1000, comment <=500)
// - Перевірка обов'язкових полів
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// ---------- Рецензії ----------
router.get('/:gameId', async (req, res) => {
  try {
    const snapshot = await db.collection('reviews')
      .where('gameId', '==', req.params.gameId)
      .get();
    const reviews = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null
      });
    });
    reviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json(reviews);
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { gameId, userId, userName, userAvatar, rating, comment } = req.body;
    if (!gameId || !userId || !userName || rating == null || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    if (comment.length > 1000) return res.status(400).json({ error: 'Comment must be under 1000 characters' });

    const existing = await db.collection('reviews')
      .where('gameId', '==', gameId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'You have already reviewed this game.', reviewId: existing.docs[0].id });
    }

    const newReview = {
      gameId, userId, userName, userAvatar: userAvatar || '', rating, comment,
      commentsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('reviews').add(newReview);
    res.status(201).json({ id: docRef.id, ...newReview });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.put('/:reviewId', async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    if (!userId || rating == null || !comment) return res.status(400).json({ error: 'Missing required fields' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    if (comment.length > 1000) return res.status(400).json({ error: 'Comment must be under 1000 characters' });

    const reviewRef = db.collection('reviews').doc(req.params.reviewId);
    const doc = await reviewRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Review not found' });
    if (doc.data().userId !== userId) return res.status(403).json({ error: 'You can only edit your own review' });

    await reviewRef.update({ rating, comment, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ success: true });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

router.delete('/:reviewId', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const reviewRef = db.collection('reviews').doc(req.params.reviewId);
    const doc = await reviewRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Review not found' });
    if (doc.data().userId !== userId) return res.status(403).json({ error: 'You can only delete your own review' });
    await reviewRef.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ---------- Коментарі до рецензій ----------
router.get('/:reviewId/comments', async (req, res) => {
  try {
    const snapshot = await db.collection('reviewComments')
      .where('reviewId', '==', req.params.reviewId)
      .orderBy('createdAt', 'asc')
      .get();
    const comments = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null
      });
    });
    res.json(comments);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

router.post('/:reviewId/comments', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, userName, userAvatar, text } = req.body;
    if (!userId || !userName || !text) return res.status(400).json({ error: 'Missing required fields' });
    if (text.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 characters)' });

    // перевіряємо, чи існує рецензія
    const reviewRef = db.collection('reviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) return res.status(404).json({ error: 'Review not found' });

    const newComment = {
      reviewId,
      userId,
      userName,
      userAvatar: userAvatar || '',
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('reviewComments').add(newComment);
    await db.collection('reviews').doc(reviewId).update({
        commentCount: admin.firestore.FieldIncrement(1)
    });
    res.status(201).json({ id: docRef.id, ...newComment });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const commentRef = db.collection('reviewComments').doc(req.params.commentId);
    const doc = await commentRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Comment not found' });
    if (doc.data().userId !== userId) return res.status(403).json({ error: 'You can only delete your own comment' });
    await commentRef.delete();
    const commentDoc = await commentRef.get();
    const reviewId = commentDoc.data()?.reviewId;
    if (reviewId) {
        await db.collection('reviews').doc(reviewId).update({
            commentCount: admin.firestore.FieldIncrement(-1)
        });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;