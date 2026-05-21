// ЗМІНИ:
// - Видалено Facebook
// - Додано показ/приховування пароля (іконка Eye)
// - Додано індикатор Caps Lock
// - Після успішної реєстрації – редірект на головну
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReCAPTCHA from "react-google-recaptcha";
import * as Yup from "yup";
import { Eye, EyeOff } from "react-feather";
import { useTranslation } from "react-i18next";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Стани для показу/приховування паролів
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Стан Caps Lock
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("error_name_empty")),
    email: Yup.string()
      .email(t("error_email_invalid"))
      .required(t("error_email_invalid")),
    password: Yup.string()
      .min(8, t("error_password_short"))
      .required(t("error_password_empty")),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], t("error_password_match") || "Паролі не збігаються")
      .required(t("error_password_empty")),
    recaptchaToken: Yup.string()
      .nullable()
      .required(t("error_recaptcha") || "Підтвердіть, що ви не робот"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await validationSchema.validate(
        { name, email, password, confirmPassword, recaptchaToken },
        { abortEarly: false }
      );

      await register(name, email, password);
      // Після успішної реєстрації – на головну
      navigate("/");
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        setError(err.errors[0]);
      } else {
        const errorMessage = err instanceof Error ? err.message : t("error_registration");
        setError(errorMessage);
      }
    }
  };

  const handleRecaptchaError = () => {
    setError(t("error_recaptcha_load") || "Помилка завантаження reCAPTCHA.");
    setRecaptchaToken(null);
  };

  // Перевірка Caps Lock
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  return (
    <div className="min-h-screen mt-[160px] bg-black font-mono text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-neutral-950/90 border border-lime-500/30 rounded-lg p-8 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
        <h2 className="text-3xl font-bold text-lime-400 mb-6 text-center uppercase tracking-wider">
          {t("register")}
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lime-400 text-sm uppercase mb-2">
              {t("name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm
                focus:outline-none focus:border-lime-500 placeholder-neutral-500 uppercase tracking-wide"
              placeholder={t("enter_name_placeholder")}
            />
          </div>
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
          <div>
            <label className="block text-lime-400 text-sm uppercase mb-2">
              {t("password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handleKeyUp}
                className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm
                  focus:outline-none focus:border-lime-500 placeholder-neutral-500 uppercase tracking-wide pr-10"
                placeholder={t("password")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lime-400 hover:text-lime-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isCapsLockOn && (
              <p className="text-yellow-400 text-xs mt-1">Caps Lock увімкнено</p>
            )}
          </div>
          <div>
            <label className="block text-lime-400 text-sm uppercase mb-2">
              {t("confirm_password") || "Підтвердження пароля"}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyUp={handleKeyUp}
                className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm
                  focus:outline-none focus:border-lime-500 placeholder-neutral-500 uppercase tracking-wide pr-10"
                placeholder={t("confirm_password_placeholder") || "Повторіть пароль"}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lime-400 hover:text-lime-300"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <ReCAPTCHA
              sitekey="6LffUSYrAAAAANrcbtWDSrMc_ZwEL1fdo_k5e04B"
              onChange={(token) => setRecaptchaToken(token)}
              onErrored={handleRecaptchaError}
              size="normal"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm
              hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
          >
            {t("register")}
          </button>
        </form>
        <p className="text-neutral-300 text-center mt-4">
          {t("no_account") ? "Вже є акаунт?" : "Already have an account?"}{" "}
          <Link to="/login" className="text-lime-400 hover:text-lime-500">
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;