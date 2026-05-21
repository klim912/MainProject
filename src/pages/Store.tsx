// ЗМІНИ:
// - Замінено SlidersHorizontal на Sliders (іконка доступна в react-feather)
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import GameList from "../components/GameList";
import { useSearchParams } from "react-router-dom";
import { Sliders, X } from "react-feather";

function Store() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="mt-48 pr-4 bg-black min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Кнопка відкриття фільтрів на мобільних */}
        <div className="lg:hidden flex justify-end px-4 pt-4">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 px-4 py-2 rounded-sm uppercase tracking-wide text-sm"
          >
            <Sliders size={16} />
            Фільтри
          </button>
        </div>

        {/* Мобільна панель фільтрів (оверлей) */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-neutral-950 border-r border-lime-500/30 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg text-lime-400 font-bold uppercase">Фільтри</h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-lime-400 hover:text-lime-300"
                >
                  <X size={20} />
                </button>
              </div>
              <Sidebar setSearchParams={setSearchParams} />
            </div>
          </div>
        )}

        {/* Десктопний сайдбар (завжди видимий, прилипаючий) */}
        <div className="hidden lg:block">
          <Sidebar setSearchParams={setSearchParams} />
        </div>

        {/* Основний контент */}
        <div className="flex-1">
          <GameList searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}

export default Store;