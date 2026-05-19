// ЗМІНИ:
// - Відображення квитанції з ключами
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Key } from "react-feather";

function OrderSuccess() {
  const location = useLocation();
  const state = location.state as { orderId?: string; amount?: string; receipt?: any; libraryItems?: any[] } | null;
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black mt-[200px] px-4 font-mono text-white">
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-lime-400 text-6xl text-center mb-4">✓</div>
        <h1 className="text-3xl font-bold text-lime-400 uppercase tracking-wider mb-8 text-center">
          {t("order_success")}
        </h1>

        {state?.receipt && (
          <div className="bg-neutral-950 border border-lime-500/30 rounded-sm p-6 mb-8">
            <h2 className="text-xl text-lime-400 mb-4">{t("receipt")}</h2>
            <div className="text-sm text-neutral-400 space-y-2">
              <p><span className="text-lime-400">{t("order_id")}:</span> {state.orderId}</p>
              <p><span className="text-lime-400">{t("date")}:</span> {new Date(state.receipt.date).toLocaleString()}</p>
              <p><span className="text-lime-400">{t("payment_method")}:</span> {state.receipt.paymentMethod}</p>
              <p><span className="text-lime-400">{t("amount_paid")}:</span> ${state.amount}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-lime-400 mb-3">{t("games")}:</h3>
              <div className="space-y-3">
                {state.receipt.games.map((game: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-lime-500/20 pb-2">
                    <div>
                      <p className="text-lime-300 text-sm">{game.title}</p>
                      <p className="text-xs text-neutral-500">{game.price} $</p>
                    </div>
                    {game.activationKey && (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <Key size={12} />
                        <span className="select-all">{game.activationKey}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link to="/library" className="bg-lime-500/10 border border-lime-500 text-lime-400 px-6 py-2 rounded-sm hover:bg-lime-500 hover:text-black transition">
            {t("library")}
          </Link>
          <Link to="/store" className="bg-neutral-900/50 border border-lime-500/30 text-lime-400 px-6 py-2 rounded-sm hover:bg-lime-500/20 transition">
            {t("store")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccess;