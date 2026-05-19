import { useEffect, useState } from "react";
import { useLibrary } from "../components/LibraryContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Key, Calendar, X } from "react-feather";

function Library() {
  const { library, getReceiptByOrderId, clearLibrary } = useLibrary();
  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    if (userSettings?.language) i18n.changeLanguage(userSettings.language);
  }, [userSettings, i18n]);

  const handleGameClick = (orderId: string) => {
    const receipt = getReceiptByOrderId(orderId);
    setSelectedReceipt(receipt || null);
  };

  return (
    <div className="min-h-screen bg-black font-mono text-white py-12 px-4 mt-22">
      <div className="max-w-6xl mx-auto mt-16">
        <h2 className="text-3xl md:text-4xl font-bold text-lime-400 mb-10 text-center tracking-wider uppercase relative
          before:content-[''] before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 before:bg-lime-500/50">
          {t("library")}
        </h2>

        <button
          onClick={clearLibrary}
          className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-sm hover:bg-red-500 hover:text-black transition"
        >
          Clear Library
        </button>

        {library.length === 0 ? (
          <p className="text-center text-lg text-neutral-500 tracking-wide">{t("library_empty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {library.map((game) => (
              <div
                key={game.dealID + '-' + game.orderId}
                onClick={() => handleGameClick(game.orderId)}
                className="cursor-pointer bg-neutral-950/90 border border-lime-500/30 rounded-md overflow-hidden transition-all duration-300 hover:border-lime-500/50 hover:scale-[1.02] group"
              >
                <div className="h-40 bg-black flex items-center justify-center p-2">
                  <img
                    src={game.thumb || "https://via.placeholder.com/300"}
                    alt={game.title}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:brightness-110"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-sm text-lime-300 font-semibold truncate">{game.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <Calendar size={12} />
                    <span>{new Date(game.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  {game.activationKey && (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <Key size={12} />
                      <span className="select-all">{game.activationKey}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedReceipt && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              className="bg-neutral-950 border border-lime-500/30 rounded-lg p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg text-lime-400 font-bold">{t("receipt")}</h3>
                <button onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-sm text-neutral-400 space-y-2">
                <p><span className="text-lime-400">{t("order_id")}:</span> {selectedReceipt.orderId}</p>
                <p><span className="text-lime-400">{t("date")}:</span> {new Date(selectedReceipt.date).toLocaleString()}</p>
                <p><span className="text-lime-400">{t("payment_method")}:</span> {selectedReceipt.paymentMethod}</p>
                <p><span className="text-lime-400">{t("amount_paid")}:</span> ${selectedReceipt.amount}</p>
              </div>
              <div className="mt-4">
                <h4 className="text-lime-400 text-sm mb-2">{t("games")}:</h4>
                {selectedReceipt.games.map((g: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-lime-500/20 py-1">
                    <span className="text-lime-300 text-xs">{g.title}</span>
                    <div className="text-right">
                      <span className="text-neutral-500 text-xs">{g.quantity} x ${g.price}</span>
                      {g.activationKey && (
                        <p className="text-green-400 text-xs flex items-center gap-1"><Key size={10} /> {g.activationKey}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Library;