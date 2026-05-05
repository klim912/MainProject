// ЗМІНИ:
// - Додано стан genre для відображення вибраного жанру в кнопці (рядок ~14)
// - Логіка handleFilterChange тепер оновлює genre (рядок ~20)
// - CustomSelect отримує актуальний value для жанру (рядок ~62)
// - Решта без змін
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

function Sidebar({ setSearchParams }: { setSearchParams: any }) {
  const [sortOption, setSortOption] = useState(() => {
    return localStorage.getItem("sortOption") || "price-asc";
  });
  const [genreOption, setGenreOption] = useState("");

  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();

  useEffect(() => {
    if (userSettings?.language) {
      i18n.changeLanguage(userSettings.language);
    }
  }, [userSettings, i18n]);

  useEffect(() => {
    localStorage.setItem("sortOption", sortOption);
    setSearchParams((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("sort", sortOption);
      return newParams;
    });
  }, [sortOption, setSearchParams]);

  const handleFilterChange = (name: string, value: string) => {
    if (name === "genre") {
      setGenreOption(value);
    }
    setSearchParams((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      newParams.set(name, value);
      return newParams;
    });
  };

  const handleSortChange = (value: string) => {
    setSortOption(value);
  };

  return (
    <aside
      className="w-64 bg-neutral-950 border-r mt-[30px] border-lime-500/30 p-6 text-white font-mono sticky top-0 self-start min-h-screen"
      style={{ maxHeight: "100vh", overflowY: "auto" }}
    >
      <h2
        className="text-xl md:text-2xl font-bold text-lime-400 mb-8 tracking-wider uppercase relative
          before:content-[''] before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 before:bg-lime-500/50
          before:transform before:transition-transform before:duration-300 hover:before:scale-x-110"
      >
        {t("filters")}
      </h2>

      <div className="space-y-6">
        <div>
          <label className="text-lime-400 text-sm tracking-wide uppercase">
            {t("genre")}
          </label>
          <CustomSelect
            name="genre"
            value={genreOption}
            onChange={(value) => handleFilterChange("genre", value)}
            options={[
              { value: "", label: t("all") },
              { value: "Action", label: t("genre_action") },
              { value: "RPG", label: t("genre_rpg") },
              { value: "Shooter", label: t("genre_shooter") },
              { value: "Strategy", label: t("genre_strategy") },
            ]}
            t={t}
          />
        </div>

        <div>
          <label className="text-lime-400 text-sm tracking-wide uppercase">
            {t("sort_by")}
          </label>
          <CustomSelect
            name="sort"
            value={sortOption}
            onChange={handleSortChange}
            options={[
              { value: "price-asc", label: t("price_asc") },
              { value: "price-desc", label: t("price_desc") },
              { value: "rating-asc", label: t("rating_asc") },
              { value: "rating-desc", label: t("rating_desc") },
            ]}
            t={t}
          />
        </div>
      </div>
    </aside>
  );
}

/**
 * Кастомне випадаюче меню, яке повністю замінює <select>.
 * Дозволяє стилізувати hover-стани опцій у стилі проєкту (lime).
 */
function CustomSelect({
  name,
  value,
  onChange,
  options,
  t,
}: {
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  t: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закриття при кліці поза компонентом
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900/50 border border-lime-500/50 text-lime-400 text-sm p-3 rounded-sm text-left
          focus:outline-none focus:border-lime-500 hover:bg-neutral-900/70 transition-all duration-300 flex justify-between items-center"
      >
        <span>{selectedOption ? selectedOption.label : t("all")}</span>
        <svg
          className={`w-4 h-4 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-20 w-full mt-1 bg-neutral-900 border border-lime-500/30 rounded-sm shadow-lg shadow-black/50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer transition-all duration-200
                ${
                  option.value === value
                    ? "bg-lime-500/10 text-lime-300"
                    : "text-lime-400 hover:bg-lime-500/20 hover:text-lime-200"
                }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Sidebar;