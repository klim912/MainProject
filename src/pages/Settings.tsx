import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

function Settings() {
  const {
    currentUser,
    userProfile,
    userSettings,
    updateUserName,
    updateUserEmail,
    updateUserPassword,
    enable2FA,
    disable2FA,
    verify2FA,
    setLanguage,
    deleteAccount,
  } = useAuth();
  const { t, i18n } = useTranslation();
  const [name, setName] = useState(userProfile?.displayName || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [language, setLocalLanguage] = useState(userSettings?.language || "uk");
  const [deletePassword, setDeletePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);

  // 2FA модальне вікно (лише для дій, що потребують підтвердження)
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>(() => Promise.resolve());

  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
    i18n.changeLanguage(language);
  }, [currentUser, navigate, language, i18n]);

  const getFirebaseErrorMessage = (error: any): string => {
    const code = error?.code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return t("error_wrong_password", "Невірний пароль");
    }
    if (code === "auth/too-many-requests") {
      return t("error_too_many_requests", "Забагато спроб. Спробуйте пізніше");
    }
    if (code === "auth/requires-recent-login") {
      return t("error_requires_recent_login", "Потрібно повторно увійти");
    }
    if (code === "auth/email-already-in-use") {
      return t("error_email_in_use", "Цей email вже використовується");
    }
    if (code === "auth/invalid-email") {
      return t("error_invalid_email", "Некоректний email");
    }
    if (code === "auth/weak-password") {
      return t("error_password_short", "Пароль має бути не менше 8 символів");
    }
    return t("error_unknown", "Сталася помилка");
  };

  // Виконує дію з перевіркою 2FA, якщо потрібно
  const executeWith2FA = (action: () => Promise<void>) => {
    if (userSettings?.twoFactorEnabled) {
      setPendingAction(() => action);
      setShow2FAModal(true);
      setTwoFactorCode("");
    } else {
      action().catch((err: any) => setError(err.code ? getFirebaseErrorMessage(err) : err.message));
    }
  };

  const handleVerify2FAForAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await verify2FA(twoFactorCode.trim());
      setShow2FAModal(false);
      setTwoFactorCode("");
      await pendingAction();
    } catch (err: any) {
      setError(err.message || t("error_tfa_invalid"));
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!name.trim()) throw new Error(t("error_name_empty"));
      await updateUserName(name);
      setSuccess(t("success_name_updated"));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return setError(t("error_email_invalid"));
    if (!password) return setError(t("error_password_empty"));
    executeWith2FA(async () => {
      await updateUserEmail(email, password);
      setSuccess(t("success_email_updated"));
      setPassword("");
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 8) return setError(t("error_password_short"));
    if (!oldPassword) return setError(t("error_password_empty"));
    executeWith2FA(async () => {
      await updateUserPassword(newPassword, oldPassword);
      setSuccess(t("success_password_updated"));
      setNewPassword("");
      setOldPassword("");
    });
  };

  const handleEnable2FA = async () => {
    setError("");
    setSuccess("");
    try {
      const { qrCodeUrl } = await enable2FA();
      setQrCodeUrl(qrCodeUrl);
      setShowQRModal(true);
      setSuccess(t("success_tfa_enabled"));
    } catch (err: any) {
      setError(err.message || t("error_tfa_failed"));
    }
  };

  const handleDisable2FA = async () => {
    setError("");
    setSuccess("");
    executeWith2FA(async () => {
      await disable2FA();
      setQrCodeUrl("");
      setShowQRModal(false);
      setSuccess(t("success_tfa_disabled"));
    });
  };

  const handleSetLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    setError("");
    setSuccess("");
    try {
      await setLanguage(selectedLanguage);
      setLocalLanguage(selectedLanguage);
      i18n.changeLanguage(selectedLanguage);
      setSuccess(t("success_language_updated"));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(t("confirm_delete_account"))) return;
    setError("");
    setSuccess("");
    if (!deletePassword) return setError(t("error_delete_account_password"));
    executeWith2FA(async () => {
      await deleteAccount(deletePassword);
      navigate("/login");
    });
  };

  if (!currentUser || !userProfile) return null;

  const isSteamUser = !!userProfile.steamId;

  return (
    <div className="min-h-screen mt-[160px] bg-black font-mono text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-lime-400 mb-12 text-center uppercase tracking-wider">
          {t("profile_settings")}
        </h2>
        {error && (
          <p className="text-red-500 text-center mb-8 bg-red-500/10 border border-red-500/50 rounded-sm py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-lime-500 text-center mb-8 bg-lime-500/10 border border-lime-500/50 rounded-sm py-2">
            {success}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Профіль */}
          <div className="bg-neutral-950/90 border border-lime-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
            <h3 className="text-2xl font-bold text-lime-400 mb-4 uppercase">{t("profile")}</h3>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-lime-400 text-sm uppercase mb-2">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
              >
                {t("save_name")}
              </button>
            </form>

            {!isSteamUser && (
              <form onSubmit={handleUpdateEmail} className="space-y-4 mt-6">
                <div>
                  <label className="block text-lime-400 text-sm uppercase mb-2">{t("new_email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-lime-400 text-sm uppercase mb-2">{t("current_password")}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
                >
                  {t("save_email")}
                </button>
              </form>
            )}
          </div>

          {/* Безпека */}
          {!isSteamUser && (
            <div className="bg-neutral-950/90 border border-lime-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
              <h3 className="text-2xl font-bold text-lime-400 mb-4 uppercase">{t("security")}</h3>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-lime-400 text-sm uppercase mb-2">{t("new_password")}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-lime-400 text-sm uppercase mb-2">{t("current_password")}</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
                >
                  {t("save_password")}
                </button>
              </form>

              <div className="mt-6 space-y-4">
                <h4 className="text-lg text-lime-400 uppercase">{t("two_factor_auth")}</h4>
                {userSettings?.twoFactorEnabled ? (
                  <>
                    <p className="text-lime-400">{t("tfa_enabled")}</p>
                    <button
                      onClick={handleDisable2FA}
                      className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
                    >
                      {t("disable_tfa")}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-lime-400">{t("tfa_disabled")}</p>
                    <button
                      onClick={handleEnable2FA}
                      className="w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
                    >
                      {t("enable_tfa")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Мова */}
          <div className="bg-neutral-950/90 border border-lime-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
            <h3 className="text-2xl font-bold text-lime-400 mb-4 uppercase">{t("language")}</h3>
            <select
              value={language}
              onChange={handleSetLanguage}
              className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
            >
              <option value="uk">{t("uk")}</option>
              <option value="en">{t("en")}</option>
              <option value="ru">{t("ru")}</option>
            </select>
          </div>

          {/* Видалення акаунта */}
          {!isSteamUser && (
            <div className="bg-neutral-950/90 border border-lime-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
              <h3 className="text-2xl font-bold text-lime-400 mb-4 uppercase">{t("delete_account")}</h3>
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-lime-400 text-sm uppercase mb-2">{t("current_password")}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-500/10 border border-red-500 text-red-400 font-semibold py-2 rounded-sm hover:bg-red-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
                >
                  {t("delete_account_button")}
                </button>
              </form>
            </div>
          )}
        </div>

        {showQRModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-neutral-950 p-6 rounded-lg border border-lime-500/30 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
              <h3 className="text-xl text-lime-400 uppercase mb-4">{t("scan_tfa_qr")}</h3>
              <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto max-w-[200px]" />
              <p className="text-lime-400 text-center mt-4">{t("scan_with_authenticator")}</p>
              <button
                onClick={() => setShowQRModal(false)}
                className="mt-4 w-full bg-lime-500/10 border border-lime-500 text-lime-400 font-semibold py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all duration-300 uppercase tracking-wide"
              >
                {t("close")}
              </button>
            </div>
          </div>
        )}

        {show2FAModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-neutral-950 p-6 rounded-lg border border-lime-500/30">
              <h3 className="text-xl text-lime-400 mb-4">{t("two_factor_auth")}</h3>
              <form onSubmit={handleVerify2FAForAction} className="space-y-4">
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-neutral-900 border border-lime-500/50 text-lime-400 p-2 rounded-sm"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-lime-500/10 border border-lime-500 text-lime-400 py-2 rounded-sm hover:bg-lime-500 hover:text-black transition"
                  >
                    {t("verify_tfa")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShow2FAModal(false); setTwoFactorCode(""); }}
                    className="px-4 py-2 bg-neutral-800 text-lime-400 rounded-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;