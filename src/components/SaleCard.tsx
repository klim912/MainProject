// ЗМІНИ:
// - Додано toast-повідомлення при додаванні в кошик та обране (рядки ~78, ~86)
// - Імпортовано useToast (рядок ~5)
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { useWishlist } from "./WishlistContext";
import { Heart } from "react-feather";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useToast } from "./ToastContext";

function SaleCard({ deal }: { deal: any }) {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userSettings?.language) {
      i18n.changeLanguage(userSettings.language);
    }
  }, [userSettings, i18n]);

  const salePrice = parseFloat(deal.salePrice);
  const normalPrice = parseFloat(deal.normalPrice);
  const savingsPercent = normalPrice > salePrice
    ? Math.round(((normalPrice - salePrice) / normalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/game/${deal.dealID}`}
      className="relative bg-neutral-950/90 border border-lime-500/30 rounded-md overflow-hidden transition-all duration-500 hover:border-lime-500/50 hover:scale-105 group"
    >
      <div className="absolute inset-0 -z-10 bg-lime-500/10 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>

      <h2 className="text-base md:text-lg font-mono font-semibold text-lime-400 text-center p-4 pb-2 tracking-wide line-clamp-2 h-20 mb-2">
        {deal.title}
      </h2>

      <div className="relative w-full h-40 bg-black flex justify-center items-center">
        <img
          src={deal.thumb}
          alt={deal.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:brightness-110"
        />
        <div className="absolute inset-0 border border-lime-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {savingsPercent > 0 && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-mono font-bold text-sm px-3 py-1.5 rounded-full shadow-lg shadow-lime-500/30 min-w-[50px] text-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-lime-500/50">
            -{savingsPercent}%
          </div>
        )}
      </div>

      <div className="flex flex-col p-4 bg-neutral-950/50 border-t border-lime-500/20">
        <div className="flex items-baseline gap-2 mb-3">
          {savingsPercent > 0 && (
            <span className="text-sm font-mono text-gray-400 line-through">
              ${normalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-mono text-green-400 font-bold">
            ${salePrice.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              addToCart(deal);
              toast(t("added_to_cart", "Added to cart"));
            }}
            className="bg-lime-500/10 border border-lime-500 text-lime-400 font-mono text-sm px-4 py-2 rounded-sm
              hover:bg-lime-500 hover:text-black transition-all duration-300 transform hover:scale-110"
          >
            {t("buy")}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              addToWishlist(deal);
              toast(t("added_to_wishlist", "Added to wishlist"));
            }}
            className="bg-neutral-900/50 border border-lime-500/50 text-lime-400 p-2 rounded-sm
              hover:bg-lime-500/20 transition-all duration-300 transform hover:scale-110"
          >
            <Heart size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}

export default SaleCard;