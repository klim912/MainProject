// ЗМІНИ:
// - Декодування gameID перед використанням у посиланні (рядки 23–24)
// - Кнопка видалення викликає removeFromCart з item.gameID (оригінальним)
// - Ключ елемента – item.gameID
import { useCart } from "../components/CartContext";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, ShoppingCart } from "react-feather";

function CartPage() {
  const { cartItems, removeFromCart } = useCart();
  const { t } = useTranslation();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-black mt-[193px] pt-8 text-center text-white font-mono">
        <p>{t("cart_empty")}</p>
        <Link
          to="/store"
          className="text-lime-400 underline mt-4 inline-block"
        >
          {t("store")}
        </Link>
      </div>
    );
  }

  const total = cartItems
    .reduce((sum, item) => sum + parseFloat(item.salePrice) * item.quantity, 0)
    .toFixed(2);

  return (
    <div className="min-h-screen bg-black mt-[193px] px-4 font-mono text-white">
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-lime-400 uppercase tracking-wider mb-8">
          <ShoppingCart className="inline mr-3" size={28} />
          {t("cart_title")}
        </h1>

        <div className="space-y-4">
          {cartItems.map((item) => {
            // Декодуємо gameID, якщо він містить % (наприклад, %3D → =)
            const decodedGameID = item.gameID.includes('%')
              ? decodeURIComponent(item.gameID)
              : item.gameID;

            return (
              <div
                key={item.gameID}
                className="flex justify-between items-center bg-neutral-950/50 border border-lime-500/20 rounded-sm p-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.thumb}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <Link
                      to={`/game/${decodedGameID}`}
                      className="text-lime-300 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-neutral-500 mt-1">
                      {t("cart_quantity")}: {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-green-400 font-bold">
                    ${parseFloat(item.salePrice).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.gameID)}
                    className="text-red-500 hover:text-red-400 transition"
                    title={t("remove_from_cart")}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-lime-500/20 mt-6 pt-4 flex justify-between">
          <span className="text-lime-400">{t("cart_total")}:</span>
          <span className="text-green-400 font-bold text-xl">${total}</span>
        </div>

        <Link
          to="/checkout"
          className="block text-center mt-8 bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-3 rounded-sm hover:bg-lime-500 hover:text-black transition-all"
        >
          {t("proceed_to_checkout")}
        </Link>
      </div>
    </div>
  );
}

export default CartPage;