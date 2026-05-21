import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSteamLogin = () => {
    window.location.href = "http://localhost:3000/auth/steam";
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err: any) {
      setError(t("error_google_login") + err.message);
    }
  };

  const getFirebaseErrorMessage = (error: any): string => {
    const code = error?.code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return t("error_invalid_credential", "Невірний email або пароль");
    }
    if (code === "auth/user-not-found") {
      return t("error_user_not_found", "Користувача з таким email не знайдено");
    }
    if (code === "auth/invalid-email") {
      return t("error_invalid_email", "Некоректний email");
    }
    if (code === "auth/too-many-requests") {
      return t("error_too_many_requests", "Забагато спроб. Спробуйте пізніше");
    }
    return t("error_email_login") + (error?.message || "");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmail(email, password);
      // Після входу (можливо, з 2FA) переходимо на головну – гейт сам обробить 2FA
      navigate("/");
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen mt-15 bg-black font-mono text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-neutral-950/90 border border-lime-500/30 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-lime-400 mb-6 text-center uppercase tracking-wider">
          {t("login")}
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <button onClick={handleSteamLogin} className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide mb-4">
          {t("login_steam")}
        </button>
        <button onClick={handleGoogleLogin} className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide mb-4">
          {t("login_google")}
        </button>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-lime-400 font-semibold mb-1">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-lime-500/30 text-white py-2 px-3 rounded-sm focus:outline-none focus:border-lime-500"
              required
            />
          </div>
          <div>
            <label className="block text-lime-400 font-semibold mb-1">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-lime-500/30 text-white py-2 px-3 rounded-sm focus:outline-none focus:border-lime-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
          >
            {t("login_email")}
          </button>
        </form>
        <p className="text-neutral-300 text-center mt-4">
          {t("forgot_password")}{" "}
          <Link to="/reset-password" className="text-lime-400 hover:text-lime-500">
            {t("reset")}
          </Link>
        </p>
        <p className="text-neutral-300 text-center mt-2">
          {t("no_account")}{" "}
          <Link to="/register" className="text-lime-400 hover:text-lime-500">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;