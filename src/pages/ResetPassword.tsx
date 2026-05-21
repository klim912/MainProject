import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checking, setChecking] = useState(false);
  const { resetPassword } = useAuth();
  const { t } = useTranslation();

  const validateEmail = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("error_invalid_email", "Введіть коректний email"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateEmail()) return;

    setChecking(true);
    try {
      // 1. Перевіряємо, чи існує користувач
      const res = await fetch(`http://localhost:3000/user/exists/${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data.exists) {
        setError(t("error_email_not_found", "Користувача з таким email не знайдено. Бажаєте зареєструватися?"));
        setChecking(false);
        return;
      }

      // 2. Відправляємо лист для скидання пароля
      await resetPassword(email);
      setSuccess(t("success_reset_email_sent", "Лист для відновлення пароля надіслано. Перевірте вашу пошту."));
      setEmail("");
    } catch (err: any) {
      setError(err.message || t("error_password_reset", "Помилка відновлення пароля"));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-mono text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-neutral-950/90 border border-lime-500/30 rounded-lg p-8 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
        <h2 className="text-3xl font-bold text-lime-400 mb-6 text-center uppercase tracking-wider">
          {t("forgot_password", "Відновлення пароля")}
        </h2>
        {error && (
          <div className="text-red-500 text-center mb-4">
            <p>{error}</p>
            {error.includes("зареєструватися") && (
              <Link to="/register" className="text-lime-400 hover:text-lime-500 underline ml-1">
                {t("register", "Зареєструватися")}
              </Link>
            )}
          </div>
        )}
        {success && <p className="text-lime-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lime-400 text-sm uppercase mb-2">
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm
                focus:outline-none focus:border-lime-500 placeholder-neutral-500 uppercase tracking-wide"
              placeholder={t("email")}
            />
          </div>
          <button
            type="submit"
            disabled={checking}
            className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm
              hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide disabled:opacity-50"
          >
            {checking ? t("loading") + "..." : t("send_reset_link", "Надіслати лист")}
          </button>
        </form>
        <p className="text-neutral-300 text-center mt-4">
          {t("back_to")}{""}
          <Link to="/login" className="text-lime-400 hover:text-lime-500">
            {t("login", "входу")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;