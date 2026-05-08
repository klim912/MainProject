// ЗМІНИ:
// - Виправлено валідацію ID: дозволені всі нечислові рядки
// - Додано commentCount до інтерфейсу Review
// - fetchComments оновлює commentCount, якщо його немає
// - handleAddComment та handleDeleteComment локально оновлюють commentCount
// - Лічильник коментарів відображається одразу
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWishlist } from "../components/WishlistContext";
import { useCart } from "../components/CartContext";
import { Star, ArrowLeft, Edit2, Trash2, MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

interface Review {
  id?: string;
  gameId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface Comment {
  id?: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToWishlist, removeFromWishlist, isGameWishlisted } = useWishlist();
  const { cartItems, addToCart, removeFromCart } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ rating: 0, comment: "" });
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  const { t, i18n } = useTranslation();
  const { userSettings, currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (userSettings?.language) i18n.changeLanguage(userSettings.language);
  }, [userSettings, i18n]);

  useEffect(() => {
    if (!id) {
      setError(t("invalid_game_id"));
      return;
    }
    // Старий числовий формат gameID – просимо оновити
    if (/^\d+$/.test(id)) {
      setError(t("invalid_game_id") + ". Please remove this game from wishlist/library and add again.");
      return;
    }

    fetch(`https://www.cheapshark.com/api/1.0/deals?id=${id}`)
      .then(res => {
        if (!res.ok) throw new Error(t("error_loading_game"));
        return res.json();
      })
      .then(data => {
        setGame(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      });
  }, [id, t]);

  useEffect(() => {
    if (!game?.gameInfo?.dealID) return;
    const dealID = game.gameInfo.dealID;
    setIsWishlisted(isGameWishlisted(dealID));
    setIsInCart(cartItems.some(item => item.gameID === dealID || item.title === game.gameInfo.name));
  }, [game, isGameWishlisted, cartItems]);

  useEffect(() => {
    if (!id || id.includes('/')) return;
    fetch(`http://localhost:3000/reviews/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
        setReviewsError(null);
      })
      .catch(() => setReviewsError(t("error_loading_reviews")));
  }, [id, t]);

  const handleWishlistToggle = () => {
    if (!game?.gameInfo?.dealID || !game.gameInfo.name) return;
    const dealID = game.gameInfo.dealID;
    if (isWishlisted) { removeFromWishlist(dealID); setIsWishlisted(false); }
    else { addToWishlist({ title: game.gameInfo.name, thumb: game.gameInfo.thumb || "", salePrice: game.gameInfo.salePrice || "0", dealID }); setIsWishlisted(true); }
  };

  const handleCartToggle = () => {
    if (!game?.gameInfo?.dealID || !game.gameInfo.name) return;
    const dealID = game.gameInfo.dealID;
    if (isInCart) { removeFromCart(dealID); setIsInCart(false); }
    else { addToCart({ title: game.gameInfo.name, thumb: game.gameInfo.thumb || "", salePrice: game.gameInfo.salePrice || "0", gameID: dealID }); setIsInCart(true); }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) { setFormError(t("login_to_review")); return; }
    if (!id || id.includes('/')) return;
    const { rating, comment } = newReview;
    if (rating < 1 || rating > 5) { setFormError(t("error_invalid_rating")); return; }
    if (!comment.trim()) { setFormError(t("error_comment_empty")); return; }
    if (comment.length > 1000) { setFormError(t("error_comment_too_long")); return; }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingReviewId) {
        const res = await fetch(`http://localhost:3000/reviews/${editingReviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, rating, comment: comment.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("error_saving_review"));
        setReviews(prev => prev.map(r => r.id === editingReviewId ? { ...r, rating, comment, updatedAt: new Date().toISOString() } : r));
        setEditingReviewId(null);
      } else {
        const res = await fetch('http://localhost:3000/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: id,
            userId: currentUser.uid,
            userName: userProfile.displayName,
            userAvatar: userProfile.avatar || '',
            rating,
            comment: comment.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data.reviewId) {
            setEditingReviewId(data.reviewId);
            setNewReview({ rating, comment: comment.trim() });
            setFormError(t("error_already_reviewed"));
            setSubmitting(false);
            return;
          }
          throw new Error(data.error || t("error_saving_review"));
        }
        setReviews(prev => [{ id: data.id, gameId: id, userId: currentUser.uid, userName: userProfile.displayName, userAvatar: userProfile.avatar || '', rating, comment: comment.trim(), commentCount: 0, createdAt: new Date().toISOString() }, ...prev]);
      }
      setNewReview({ rating: 0, comment: "" });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReviewId(review.id!);
    setNewReview({ rating: review.rating, comment: review.comment });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (reviewId: string) => {
    if (!currentUser) return;
    if (!window.confirm(t("confirm_delete_review"))) return;
    try {
      const res = await fetch(`http://localhost:3000/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
        setNewReview({ rating: 0, comment: "" });
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Функції для коментарів
  const fetchComments = async (reviewId: string) => {
    setLoadingComments(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`http://localhost:3000/reviews/${reviewId}/comments`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommentsMap(prev => ({ ...prev, [reviewId]: data }));
        // Якщо поле commentCount відсутнє (старі рецензії), заповнюємо
        setReviews(prev => prev.map(r => {
          if (r.id === reviewId && r.commentCount == null) {
            return { ...r, commentCount: data.length };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const toggleComments = (reviewId: string) => {
    if (!showComments[reviewId]) {
      fetchComments(reviewId);
      setShowComments(prev => ({ ...prev, [reviewId]: true }));
    } else {
      setShowComments(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleAddComment = async (reviewId: string) => {
    if (!currentUser || !userProfile) return;
    const text = commentInputs[reviewId]?.trim();
    if (!text || text.length > 500) return;

    try {
      const res = await fetch(`http://localhost:3000/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, userName: userProfile.displayName, userAvatar: userProfile.avatar || '', text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCommentsMap(prev => ({
        ...prev,
        [reviewId]: [...(prev[reviewId] || []), { id: data.id, reviewId, userId: currentUser.uid, userName: userProfile.displayName, userAvatar: userProfile.avatar || '', text, createdAt: new Date().toISOString() }]
      }));
      // Оновлюємо commentCount локально
      setReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          return { ...r, commentCount: (r.commentCount || 0) + 1 };
        }
        return r;
      }));
      setCommentInputs(prev => ({ ...prev, [reviewId]: '' }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteComment = async (commentId: string, reviewId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:3000/reviews/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setCommentsMap(prev => ({
        ...prev,
        [reviewId]: prev[reviewId].filter(c => c.id !== commentId)
      }));
      // Оновлюємо commentCount локально
      setReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          return { ...r, commentCount: Math.max(0, (r.commentCount || 0) - 1) };
        }
        return r;
      }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (star: number) => void) => (
    <div className="flex">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={interactive ? 20 : 16}
          onClick={interactive && onSelect ? () => onSelect(star) : undefined}
          className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"}
          style={interactive ? { cursor: 'pointer' } : {}}
        />
      ))}
    </div>
  );

  const locale = i18n.language === "en" ? "en-US" : i18n.language === "ru" ? "ru-RU" : "uk-UA";
  const goBack = () => (window.history.length > 2 ? navigate(-1) : navigate('/store'));

  if (error) return (
    <div className="min-h-screen bg-black mt-[160px] font-mono text-white flex flex-col items-center justify-center">
      <div className="text-center text-red-400 text-xl mb-4">{error}</div>
      <button onClick={goBack} className="inline-flex items-center gap-2 bg-neutral-900/50 border border-lime-500/30 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500/20">← {t("back")}</button>
    </div>
  );

  if (!game) return <div className="min-h-screen bg-black flex justify-center items-center"><Loader text={t("loading_data")} /></div>;

  return (
    <div className="min-h-screen bg-black mt-[160px] font-mono text-white py-12 px-4">
      <div className="max-w-4xl mx-auto mt-16 relative">
        <button onClick={goBack} className="inline-flex items-center gap-2 bg-neutral-900/50 border border-lime-500/30 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500/20 mb-6">← {t("back")}</button>
        <div className="border border-lime-500/30 rounded-lg p-6 bg-neutral-950/95">
          <h1 className="text-3xl font-bold text-lime-400 mb-8 text-center">{game.gameInfo.name || t("unknown_game")}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <img src={game.gameInfo.thumb || "https://via.placeholder.com/300"} className="w-full rounded-md" />
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-lime-400">{t("price")}</span><span className="text-green-400 font-bold">${game.gameInfo.salePrice || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-lime-400">{t("retail_price")}</span><span className="line-through text-neutral-600">${game.gameInfo.retailPrice || "N/A"}</span></div>
              <button onClick={handleWishlistToggle} className={`w-full py-3 rounded border ${isWishlisted ? 'border-lime-400' : 'border-lime-500'} bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition`}>{isWishlisted ? t("remove_from_wishlist") : t("add_to_wishlist")}</button>
              <button onClick={handleCartToggle} className={`w-full py-3 rounded border ${isInCart ? 'border-lime-400' : 'border-lime-500'} bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition`}>{isInCart ? t("remove_from_cart") : t("add_to_cart")}</button>
            </div>
          </div>

          {/* Оцінки */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="border border-lime-500/20 rounded p-4 text-center"><div className="text-lime-400 uppercase text-sm mb-1">{t("steam_rating")}</div><div className="text-2xl font-bold">{game.gameInfo.steamRatingText || "N/A"}</div></div>
            <div className="border border-lime-500/20 rounded p-4 text-center"><div className="text-lime-400 uppercase text-sm mb-1">{t("metacritic_score")}</div><div className="text-2xl font-bold">{game.gameInfo.metacriticScore ? `${game.gameInfo.metacriticScore}/100` : "N/A"}</div></div>
          </div>

          {/* Рецензії */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-lime-400 mb-6 text-center">{t("user_reviews")}</h2>

            {currentUser ? (
              <form onSubmit={handleSubmitReview} className="bg-neutral-900/50 border border-lime-500/30 rounded p-4 mb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={userProfile?.avatar || "../src/assets/avatar.png"} alt="" className="size-8 rounded-full border border-lime-500/30" />
                  <span className="text-lime-300 text-sm">{userProfile?.displayName}</span>
                  {editingReviewId && <span className="text-yellow-400 text-xs">({t("editing_review")})</span>}
                </div>
                <div className="flex space-x-1">
                  {renderStars(newReview.rating, true, (star) => setNewReview({...newReview, rating: star}))}
                </div>
                <textarea
                  value={newReview.comment}
                  onChange={e => setNewReview({...newReview, comment: e.target.value})}
                  placeholder={t("enter_comment_placeholder")}
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-neutral-950 border border-lime-500/50 text-lime-400 p-2 rounded"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">{newReview.comment.length}/1000</span>
                  {formError && <p className="text-red-500 text-sm">{formError}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="flex-1 bg-lime-500/10 border border-lime-500 text-lime-400 py-2 rounded hover:bg-lime-500 hover:text-black transition">
                    {editingReviewId ? t("update_review") : t("submit_review")}
                  </button>
                  {editingReviewId && (
                    <button type="button" onClick={() => { setEditingReviewId(null); setNewReview({rating:0, comment:""}); setFormError(null); }} className="px-3 py-2 bg-neutral-900 border border-lime-500/30 text-lime-400 rounded hover:bg-neutral-800">{t("cancel")}</button>
                  )}
                </div>
              </form>
            ) : (
              <p className="text-center text-neutral-500 mb-6">{t("login_to_review")}</p>
            )}

            {reviewsError && <p className="text-red-500 text-center mb-4">{reviewsError}</p>}
            {reviews.length === 0 && !reviewsError && <p className="text-neutral-500 text-center">{t("no_reviews")}</p>}
            {reviews.map((review) => (
              <div key={review.id} className="border border-lime-500/20 rounded p-3 mb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <img src={review.userAvatar || "../src/assets/avatar.png"} alt="" className="size-6 rounded-full border border-lime-500/30" />
                    <span className="text-lime-400 font-semibold text-sm">{review.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {new Date(review.createdAt).toLocaleDateString(locale)}
                      {review.updatedAt && ` (${t("edited")})`}
                    </span>
                    {currentUser && review.userId === currentUser.uid && (
                      <>
                        <button onClick={() => handleEdit(review)} className="text-lime-400 hover:text-lime-300"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(review.id!)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex mt-1">{renderStars(review.rating)}</div>
                <p className="text-neutral-300 text-sm mt-2 whitespace-pre-line">{review.comment}</p>

                {/* Коментарі до рецензії */}
                <div className="mt-3 border-t border-lime-500/20 pt-3">
                  <button
                    onClick={() => toggleComments(review.id!)}
                    className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare size={12} />
                    {showComments[review.id!] ? t("hide_comments") : t("view_comments")} ({review.commentCount ?? 0})
                  </button>

                  {showComments[review.id!] && (
                    <div className="mt-3 space-y-2">
                      {loadingComments[review.id!] ? (
                        <p className="text-xs text-neutral-500">{t("loading")}...</p>
                      ) : (
                        <>
                          {commentsMap[review.id!]?.length === 0 && (
                            <p className="text-xs text-neutral-500">{t("no_comments")}</p>
                          )}
                          {commentsMap[review.id!]?.map(comment => (
                            <div key={comment.id} className="flex gap-2 items-start pl-2 border-l-2 border-lime-500/20">
                              <img src={comment.userAvatar || "../src/assets/avatar.png"} alt="" className="size-5 rounded-full mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-lime-300 font-semibold">{comment.userName}</span>
                                  <span className="text-xs text-neutral-500">
                                    {new Date(comment.createdAt).toLocaleDateString(locale)}
                                  </span>
                                  {currentUser && comment.userId === currentUser.uid && (
                                    <button onClick={() => handleDeleteComment(comment.id!, review.id!)} className="text-red-500 hover:text-red-400 ml-auto">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-300 mt-0.5">{comment.text}</p>
                              </div>
                            </div>
                          ))}

                          {currentUser && (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="text"
                                value={commentInputs[review.id!] || ''}
                                onChange={e => setCommentInputs(prev => ({ ...prev, [review.id!]: e.target.value }))}
                                placeholder={t("write_comment_placeholder")}
                                maxLength={500}
                                className="flex-1 text-xs bg-neutral-900 border border-lime-500/30 rounded px-2 py-1 text-lime-400 focus:outline-none focus:border-lime-500"
                              />
                              <span className="text-xs text-neutral-600">{(commentInputs[review.id!] || '').length}/500</span>
                              <button
                                onClick={() => handleAddComment(review.id!)}
                                disabled={!commentInputs[review.id!]?.trim()}
                                className="text-lime-400 hover:text-lime-300 disabled:text-neutral-600 cursor-pointer"
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;