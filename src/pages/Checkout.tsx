import { useCart } from "../components/CartContext";
import { useLibrary } from "../components/LibraryContext";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Checkout() {
  const { cartItems, balance, checkout } = useCart();
  const { addToLibrary, addReceipt, refreshLibrary } = useLibrary();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const total = cartItems
    .reduce((sum, item) => sum + parseFloat(item.salePrice) * item.quantity, 0)
    .toFixed(2);

  const handleCheckout = async () => {
    const result = await checkout();
    if (result.success) {
      if (result.libraryItems && result.orderId) {
        addToLibrary(result.libraryItems, result.orderId);
      }
      if (result.receipt) {
        addReceipt(result.receipt);
      }
      await refreshLibrary();
      localStorage.setItem(
        "lastReceipt",
        JSON.stringify({
          orderId: result.orderId,
          amount: total,
          receipt: result.receipt,
        })
      );
      navigate("/order-success", {
        state: { orderId: result.orderId, amount: total, receipt: result.receipt },
      });
    } else {
      alert(result.error || "Payment failed");
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-black mt-[193px] text-center text-white font-mono">
        <p>{t("cart_empty")}</p>
        <Link to="/store" className="text-lime-400 underline mt-4 inline-block">
          {t("store")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black mt-[193px] px-4 font-mono text-white">
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-lime-400 uppercase tracking-wider mb-8">
          {t("proceed_to_checkout")}
        </h1>
        <div className="border border-lime-500/30 rounded-sm p-6 bg-neutral-950/95">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.gameID} className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img src={item.thumb} alt={item.title} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <p className="text-lime-300">{item.title}</p>
                    <p className="text-sm text-neutral-500">
                      {t("cart_quantity")}: {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="text-green-400 font-bold">
                  ${parseFloat(item.salePrice).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-lime-500/20 mt-6 pt-4 flex justify-between">
            <span className="text-lime-400">{t("cart_total")}:</span>
            <span className="text-green-400 font-bold text-xl">${total}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-lime-400">{t("balance")}:</span>
            <span className="text-green-400">${balance.toFixed(2)}</span>
          </div>

          {parseFloat(total) > balance && (
            <p className="text-red-500 mt-4">{t("insufficient_balance")}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={parseFloat(total) > balance}
            className="w-full mt-6 bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-3 rounded-sm hover:bg-lime-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("pay")} ${total}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;