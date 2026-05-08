// ЗМІНИ:
// - Новий компонент Loader з анімованим кільцем у стилі сайту
// - Використовує lime-кольори та темний фон
import { useTranslation } from "react-i18next";

export default function Loader({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-lime-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-transparent border-t-lime-400 rounded-full animate-spin"></div>
      </div>
      <span className="text-lime-400 font-mono text-sm uppercase tracking-wide">
        {text || t("loading")}
      </span>
    </div>
  );
}