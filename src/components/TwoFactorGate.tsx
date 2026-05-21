import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Loader from "./Loader";

export default function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { currentUser, userSettings, is2FAVerified, verify2FA, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Поки завантажуються налаштування – показуємо лоадер
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <Loader text={t("loading")} />
      </div>
    );
  }

  // Не блокуємо сторінки авторизації та налаштувань, щоб користувач міг увімкнути/вимкнути 2FA
  const skipPaths = ["/settings", "/login", "/register"];
  if (skipPaths.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Якщо користувач не авторизований або 2FA не потрібна або вже пройдена – пропускаємо
  if (!currentUser || !userSettings?.twoFactorEnabled || is2FAVerified) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setVerifying(true);
    try {
      await verify2FA(code.trim());
      // Після успіху компонент перерендериться, бо is2FAVerified зміниться
    } catch (err: any) {
      setError(err.message || t("error_tfa_invalid"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono text-white px-4">
      <div className="max-w-md w-full bg-neutral-950/90 border border-lime-500/30 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-lime-400 mb-4 text-center uppercase">
          {t("two_factor_auth")}
        </h2>
        <p className="text-neutral-400 text-sm text-center mb-6">
          {t("enter_tfa_code")}
        </p>
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="w-full px-4 py-3 text-center bg-neutral-900 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500 text-xl tracking-widest"
            maxLength={6}
          />
          <button
            type="submit"
            disabled={verifying || code.length < 6}
            className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase disabled:opacity-50"
          >
            {verifying ? t("loading") + "..." : t("verify_tfa")}
          </button>
        </form>
      </div>
    </div>
  );
}