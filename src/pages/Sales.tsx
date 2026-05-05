// ЗМІНИ:
// - Збільшено верхній відступ до mt-[200px] для запобігання перекриттю хедером (рядок ~24)
import { useEffect, useState } from "react";
import SaleCard from "../components/SaleCard";
import { useTranslation } from "react-i18next";

function Sales() {
  const [deals, setDeals] = useState<any[]>([]);
  const [visible, setVisible] = useState(8);
  const [sortBy, setSortBy] = useState("savings");

  const { t } = useTranslation();

  useEffect(() => {
    const url = `https://www.cheapshark.com/api/1.0/deals?storeID=3&upperPrice=100&sortBy=savings&pageSize=20`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          switch (sortBy) {
            case "price-asc":
              return parseFloat(a.salePrice) - parseFloat(b.salePrice);
            case "price-desc":
              return parseFloat(b.salePrice) - parseFloat(a.salePrice);
            case "rating":
              return parseFloat(b.dealRating || 0) - parseFloat(a.dealRating || 0);
            case "savings":
            default:
              return parseFloat(b.savings) - parseFloat(a.savings);
          }
        });
        setDeals(sorted);
      })
      .catch((err) => console.error(`${t("error_fetch")}:`, err));
  }, [sortBy, t]);

  return (
    <div className="mt-[193px] pr-[16px] bg-black min-h-screen">
      <div className="flex flex-col md:flex-row gap-6">
        <DealsSidebar sortBy={sortBy} onSortChange={setSortBy} />

        <div className="flex-1">
          <p className="text-gray-600 mb-4">{t("games_found", { count: deals.length })}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {deals.slice(0, visible).map((deal) => (
              <SaleCard key={deal.dealID} deal={deal} />
            ))}
          </div>

          {visible < deals.length && (
            <div className="text-center mt-6">
              <button
                onClick={() => setVisible((v) => v + 8)}
                className="px-6 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 text-sm rounded-sm uppercase tracking-wide font-mono
                  hover:bg-lime-500 hover:text-black transition-all duration-300 transform hover:scale-105"
              >
                {t("load_more")}
              </button>
            </div>
          )}

          {deals.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              {t("no_results")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealsSidebar({
  sortBy,
  onSortChange,
}: {
  sortBy: string;
  onSortChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: "savings", labelKey: "sort_by_savings", fallback: "Biggest Savings" },
    { value: "price-asc", labelKey: "sort_price_asc", fallback: "Price: Low to High" },
    { value: "price-desc", labelKey: "sort_price_desc", fallback: "Price: High to Low" },
    { value: "rating", labelKey: "sort_rating", fallback: "Best Rating" },
  ];

  return (
    <aside className="w-full md:w-64 bg-neutral-950/90 border border-lime-500/30 rounded-md p-4 h-fit">
      <h2 className="text-lg font-mono font-semibold text-lime-400 mb-3">
        {t("sort_by", "Sort By")}
      </h2>
      <div className="flex flex-col gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`text-left font-mono text-sm px-3 py-2 rounded-sm border transition-all
              ${
                sortBy === option.value
                  ? "bg-lime-500/20 border-lime-400 text-lime-300"
                  : "bg-neutral-900 border-lime-500/30 text-lime-400 hover:bg-lime-500/10 hover:border-lime-500/50"
              }`}
          >
            {t(option.labelKey, option.fallback)}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sales;