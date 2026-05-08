// ЗМІНИ:
// - Повернуто секцію з оцінками (Steam Rating, Metacritic Score) (рядки ~160-175)
// - Повернуто секцію рецензій (рядки ~200-280)
// - Додано перевірку на числовий ID для старих записів (рядок ~29)
// - Кнопка "Назад" повертає на попередню сторінку (рядок ~13)
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWishlist } from "../components/WishlistContext";
import { useCart } from "../components/CartContext";
import { Star, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

interface Review {
  gameTitle: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: string;
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
  const [newReview, setNewReview] = useState({ userName: "", rating: 0, comment: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();

  useEffect(() => {
    if (userSettings?.language) i18n.changeLanguage(userSettings.language);
  }, [userSettings, i18n]);

  useEffect(() => {
    if (!id) {
      setError(t("invalid_game_id"));
      return;
    }

    // Перевірка на старий числовий формат ID
    if (/^\d+$/.test(id)) {
      setError(t("invalid_game_id") + ". Please remove this game from wishlist and add again.");
      return;
    }

    fetch(`https://www.cheapshark.com/api/1.0/deals?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(t("error_loading_game"));
        return res.json();
      })
      .then((data) => {
        setGame(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [id, t]);

  useEffect(() => {
    if (!game?.gameInfo?.dealID) return;
    const dealID = game.gameInfo.dealID;
    setIsWishlisted(isGameWishlisted(dealID));
    setIsInCart(cartItems.some(item => item.gameID === dealID || item.title === game.gameInfo.name));

    const storedReviews = JSON.parse(localStorage.getItem("reviews") || "[]");
    setReviews(storedReviews.filter((r: Review) => r.gameTitle === game.gameInfo.name));
  }, [game, isGameWishlisted, cartItems]);

  const handleWishlistToggle = () => {
    if (!game?.gameInfo?.dealID || !game.gameInfo.name) return;
    const dealID = game.gameInfo.dealID;
    if (isWishlisted) {
      removeFromWishlist(dealID);
      setIsWishlisted(false);
    } else {
      addToWishlist({
        title: game.gameInfo.name,
        thumb: game.gameInfo.thumb || "",
        salePrice: game.gameInfo.salePrice || "0",
        dealID,
      });
      setIsWishlisted(true);
    }
  };

  const handleCartToggle = () => {
    if (!game?.gameInfo?.dealID || !game.gameInfo.name) return;
    const dealID = game.gameInfo.dealID;
    if (isInCart) {
      removeFromCart(dealID);
      setIsInCart(false);
    } else {
      addToCart({
        title: game.gameInfo.name,
        thumb: game.gameInfo.thumb || "",
        salePrice: game.gameInfo.salePrice || "0",
        gameID: dealID,
      });
      setIsInCart(true);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game?.gameInfo?.name) return;
    const { userName, rating, comment } = newReview;
    if (!userName.trim()) { setFormError(t("error_name_empty")); return; }
    if (rating < 1 || rating > 5) { setFormError(t("error_invalid_rating")); return; }
    if (!comment.trim()) { setFormError(t("error_comment_empty")); return; }

    const review: Review = {
      gameTitle: game.gameInfo.name,
      userName: userName.trim(),
      rating,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    };
    const stored = JSON.parse(localStorage.getItem("reviews") || "[]");
    localStorage.setItem("reviews", JSON.stringify([...stored, review]));
    setReviews(prev => [...prev, review]);
    setNewReview({ userName: "", rating: 0, comment: "" });
    setFormError(null);
  };

  const renderStars = (rating: number) => (
    <div className="flex">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={16} className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"} />
      ))}
    </div>
  );

  const locale = i18n.language === "en" ? "en-US" : i18n.language === "ru" ? "ru-RU" : "uk-UA";
  const goBack = () => (window.history.length > 2 ? navigate(-1) : navigate('/store'));

  if (error) {
    return (
      <div className="min-h-screen bg-black mt-[160px] font-mono text-white flex flex-col items-center justify-center">
        <div className="text-center text-red-400 text-xl mb-4">{error}</div>
        <button onClick={goBack} className="inline-flex items-center gap-2 bg-neutral-900/50 border border-lime-500/30 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500/20">← {t("back")}</button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <Loader text={t("loading_data")} />
      </div>
    );
  }

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

              <button onClick={handleWishlistToggle} className={`w-full py-3 rounded border ${isWishlisted ? 'border-lime-400' : 'border-lime-500'} bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition`}>
                {isWishlisted ? t("remove_from_wishlist") : t("add_to_wishlist")}
              </button>
              <button onClick={handleCartToggle} className={`w-full py-3 rounded border ${isInCart ? 'border-lime-400' : 'border-lime-500'} bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition`}>
                {isInCart ? t("remove_from_cart") : t("add_to_cart")}
              </button>
            </div>
          </div>

          {/* Оцінки */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="border border-lime-500/20 rounded p-4 text-center">
              <div className="text-lime-400 uppercase text-sm mb-1">{t("steam_rating")}</div>
              <div className="text-2xl font-bold">{game.gameInfo.steamRatingText || "N/A"}</div>
            </div>
            <div className="border border-lime-500/20 rounded p-4 text-center">
              <div className="text-lime-400 uppercase text-sm mb-1">{t("metacritic_score")}</div>
              <div className="text-2xl font-bold">{game.gameInfo.metacriticScore ? `${game.gameInfo.metacriticScore}/100` : "N/A"}</div>
            </div>
          </div>

          {/* Рецензії */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-lime-400 mb-6 text-center">{t("user_reviews")}</h2>
            <form onSubmit={handleReviewSubmit} className="bg-neutral-900/50 border border-lime-500/30 rounded p-4 mb-6 space-y-3">
              <input type="text" value={newReview.userName} onChange={e => setNewReview({...newReview, userName: e.target.value})} placeholder={t("enter_name_placeholder")} className="w-full bg-neutral-950 border border-lime-500/50 text-lime-400 p-2 rounded" />
              <div className="flex space-x-1 text-yellow-400">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} size={20} onClick={() => setNewReview({...newReview, rating: star})} className={star <= newReview.rating ? "fill-yellow-400 text-yellow-400 cursor-pointer" : "text-neutral-600 cursor-pointer"} />
                ))}
              </div>
              <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder={t("enter_comment_placeholder")} rows={3} className="w-full bg-neutral-950 border border-lime-500/50 text-lime-400 p-2 rounded" />
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <button type="submit" className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 py-2 rounded hover:bg-lime-500 hover:text-black transition">{t("submit_review")}</button>
            </form>

            {reviews.length === 0 && <p className="text-neutral-500 text-center">{t("no_reviews")}</p>}
            {reviews.map((review, idx) => (
              <div key={idx} className="border border-lime-500/20 rounded p-3 mb-2">
                <div className="flex justify-between"><span className="text-lime-400 font-semibold">{review.userName}</span><span className="text-xs text-neutral-500">{new Date(review.timestamp).toLocaleDateString(locale)}</span></div>
                <div className="flex mt-1">{renderStars(review.rating)}</div>
                <p className="text-neutral-300 text-sm mt-2">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;