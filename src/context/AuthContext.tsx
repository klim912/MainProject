// ЗМІНИ:
// - is2FAVerified зберігається/читається з sessionStorage
// - set2FAVerified оновлює sessionStorage
// - logout очищає запис 2FA
// - Решта функцій без змін, але signInWithEmail, signInWithGoogle тощо не встановлюють 2FA
import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendEmailVerification,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { createLogger } from "../utils/logger";
import { fromFirebaseAuthError, AppError, ERROR_CODES, PaymentError, DataError } from "../utils/errors";

const log = createLogger("AuthContext");

interface UserProfile {
  displayName: string;
  avatar: string;
  email?: string;
  steamId?: string;
  profileUrl?: string;
  countryCode?: string;
  stateCode?: string;
  cityId?: number | null;
}

interface UserSettings {
  language: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

interface AuthContextType {
  currentUser: any;
  userProfile: UserProfile | null;
  userSettings: UserSettings | null;
  loading: boolean;
  is2FAVerified: boolean;
  set2FAVerified: (verified: boolean) => void;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithSteam: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateUserEmail: (email: string, password: string) => Promise<void>;
  updateUserPassword: (newPassword: string, oldPassword: string) => Promise<void>;
  enable2FA: () => Promise<{ secret: string; qrCodeUrl: string }>;
  verify2FA: (code: string) => Promise<void>;
  disable2FA: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  userSettings: null,
  loading: true,
  is2FAVerified: false,
  set2FAVerified: () => {},
  logout: async () => {},
  signInWithGoogle: async () => {},
  signInWithFacebook: async () => {},
  signInWithSteam: async () => {},
  signInWithEmail: async () => {},
  register: async () => {},
  resetPassword: async () => {},
  updateUserName: async () => {},
  updateUserEmail: async () => {},
  updateUserPassword: async () => {},
  enable2FA: async () => ({ secret: "", qrCodeUrl: "" }),
  verify2FA: async () => {},
  disable2FA: async () => {},
  setLanguage: async () => {},
  deleteAccount: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuth();
  const db = getFirestore();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  const set2FAVerified = (verified: boolean) => {
    setIs2FAVerified(verified);
    if (currentUser) {
      if (verified) {
        sessionStorage.setItem(`2fa_verified_${currentUser.uid}`, "1");
      } else {
        sessionStorage.removeItem(`2fa_verified_${currentUser.uid}`);
      }
    }
  };

  useEffect(() => {
    log.info("AuthProvider mounted — subscribing to Firebase auth state");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        sessionStorage.setItem("gs_uid", user.uid);

        // Відновлюємо стан 2FA з sessionStorage
        const stored = sessionStorage.getItem(`2fa_verified_${user.uid}`);
        if (stored) {
          setIs2FAVerified(true);
        } else {
          setIs2FAVerified(false);
        }

        log.info("User authenticated", {
          uid: user.uid,
          provider: user.providerData[0]?.providerId ?? "unknown",
          emailVerified: user.emailVerified,
        });

        try {
          const userDoc = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDoc);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            log.debug("User profile loaded from Firestore", { uid: user.uid });
          } else {
            const newProfile: UserProfile = {
              displayName: user.displayName || user.email || "Користувач",
              avatar: user.photoURL || "../src/assets/avatar.png",
              email: user.email || undefined,
            };
            await setDoc(userDoc, newProfile);
            setUserProfile(newProfile);
            log.info("New user profile created in Firestore", { uid: user.uid });
          }

          const settingsDoc = doc(db, "users", user.uid, "settings", "preferences");
          const settingsSnap = await getDoc(settingsDoc);

          if (settingsSnap.exists()) {
            setUserSettings(settingsSnap.data() as UserSettings);
            log.debug("User settings loaded", { uid: user.uid });
          } else {
            const defaultSettings: UserSettings = {
              language: "uk",
              twoFactorEnabled: false,
            };
            await setDoc(settingsDoc, defaultSettings);
            setUserSettings(defaultSettings);
            log.info("Default settings created for new user", { uid: user.uid });
          }
        } catch (_err: unknown) {
          const appErr = new DataError(
            "Failed to load user profile/settings from Firestore",
            ERROR_CODES.DATA_FETCH_FAILED,
            { uid: user.uid }
          );
          log.warn("Using fallback profile due to Firestore error", {
            errorId: appErr.errorId,
            uid: user.uid,
          });

          setUserProfile({
            displayName: user.displayName || user.email || "Користувач",
            avatar: user.photoURL || "../src/assets/avatar.png",
            email: user.email || undefined,
          });
          setUserSettings({ language: "uk", twoFactorEnabled: false });
        }
      } else {
        sessionStorage.removeItem("gs_uid");
        log.info("User signed out — clearing profile and settings");
        setUserProfile(null);
        setUserSettings(null);
        setIs2FAVerified(false);
      }

      setLoading(false);
    });

    return () => {
      log.debug("AuthProvider unmounting — unsubscribing from auth state");
      unsubscribe();
    };
  }, [auth, db]);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = async () => {
    log.info("Logout initiated", { uid: currentUser?.uid });
    try {
      await fetch("http://localhost:3000/logout", {
        method: "POST",
        credentials: "include",
      });
      await signOut(auth);
      if (currentUser) {
        sessionStorage.removeItem(`2fa_verified_${currentUser.uid}`);
      }
      setUserProfile(null);
      setUserSettings(null);
      setIs2FAVerified(false);
      log.info("Logout successful");
    } catch (_err: unknown) {
      const appErr = new AppError(
        "Logout failed",
        ERROR_CODES.UNKNOWN,
        { uid: currentUser?.uid }
      );
      log.error("Logout failed", { errorId: appErr.errorId });
      throw new Error(t("error_logout"));
    }
  };

  // ─── Social login ─────────────────────────────────────────────────────────

  const signInWithGoogle = async () => {
    log.info("Google sign-in initiated");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      log.info("Google sign-in successful");
    } catch (_err: unknown) {
      const appErr = fromFirebaseAuthError(_err, { provider: "google" });
      log.error("Google sign-in failed", { errorId: appErr.errorId, code: appErr.code });
      throw new Error(t("error_google_login"));
    }
  };

  const signInWithFacebook = async () => {
    throw new Error(t("error_facebook_login"));
  };

  const signInWithSteam = async () => {
    log.info("Steam sign-in redirect initiated");
    try {
      window.location.href = "http://localhost:3000/auth/steam";
    } catch (_err: unknown) {
      const appErr = new AppError(
        "Steam redirect failed",
        ERROR_CODES.AUTH_STEAM_FAILED,
        { provider: "steam" }
      );
      log.error("Steam redirect failed", { errorId: appErr.errorId });
      throw new Error(t("error_steam_login"));
    }
  };

  // ─── Email sign-in (без перевірки emailVerified) ─────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    log.info("Email sign-in initiated");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      log.info("Email sign-in successful", { uid: user.uid });
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, { method: "email" });
      log.error("Email sign-in failed", { errorId: appErr.errorId, code: appErr.code });
      throw err;
    }
  };

  // ─── Register ─────────────────────────────────────────────────────────────

  const register = async (name: string, email: string, password: string) => {
    log.info("User registration initiated");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);

      const userDoc = doc(db, "users", user.uid);
      const newProfile: UserProfile = {
        displayName: name,
        avatar: "../src/assets/avatar.png",
        email,
      };
      await setDoc(userDoc, newProfile);

      const settingsDoc = doc(db, "users", user.uid, "settings", "preferences");
      const defaultSettings: UserSettings = {
        language: "uk",
        twoFactorEnabled: false,
      };
      await setDoc(settingsDoc, defaultSettings);

      log.info("User registration successful — verification email sent", { uid: user.uid });
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, { method: "register" });
      log.error("User registration failed", { errorId: appErr.errorId, code: appErr.code });
      throw err;
    }
  };

  // ─── Reset password ───────────────────────────────────────────────────────

  const resetPassword = async (email: string) => {
    log.info("Password reset requested");
    try {
      await sendPasswordResetEmail(auth, email);
      log.info("Password reset email sent");
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, { method: "resetPassword" });
      log.error("Password reset failed", { errorId: appErr.errorId, code: appErr.code });
      throw new Error(`${t("error_password_reset")}: ${err.message}`);
    }
  };

  // ─── Profile updates ──────────────────────────────────────────────────────

  const updateUserName = async (name: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    log.info("Updating display name", { uid: currentUser.uid });
    try {
      await updateProfile(currentUser, { displayName: name });
      const userDoc = doc(db, "users", currentUser.uid);
      await setDoc(userDoc, { displayName: name }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, displayName: name } : null));
      log.info("Display name updated successfully", { uid: currentUser.uid });
    } catch (err: any) {
      const appErr = new DataError(
        "Display name update failed",
        ERROR_CODES.DATA_WRITE_FAILED,
        { uid: currentUser.uid }
      );
      log.error("Display name update failed", { errorId: appErr.errorId });
      throw err;
    }
  };

  const updateUserEmail = async (email: string, password: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    if (!currentUser.email) throw new Error(t("error_email_missing"));

    log.info("Updating user email", { uid: currentUser.uid });
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, email);
      await sendEmailVerification(currentUser);

      const userDoc = doc(db, "users", currentUser.uid);
      await setDoc(userDoc, { email }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, email } : null));

      log.info("Email updated — verification email sent", { uid: currentUser.uid });
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, {
        uid: currentUser.uid,
        operation: "updateEmail",
      });
      log.error("Email update failed", { errorId: appErr.errorId, code: appErr.code });
      throw err;
    }
  };

  const updateUserPassword = async (newPassword: string, oldPassword: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    if (!currentUser.email) throw new Error(t("error_email_missing"));

    log.info("Updating user password", { uid: currentUser.uid });
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      log.info("Password updated successfully", { uid: currentUser.uid });
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, {
        uid: currentUser.uid,
        operation: "updatePassword",
      });
      log.error("Password update failed", { errorId: appErr.errorId, code: appErr.code });
      throw err;
    }
  };

  // ─── 2FA ──────────────────────────────────────────────────────────────────

  const enable2FA = async () => {
    if (!currentUser) throw new Error(t("error_no_user"));
    log.info("2FA enable initiated", { uid: currentUser.uid });
    try {
      const response = await fetch("http://localhost:3000/generate-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
        body: JSON.stringify({ uid: currentUser.uid }),
      });

      if (!response.ok) {
        throw new Error(t("error_tfa_failed"));
      }

      const { secret, qrCodeUrl } = await response.json();

      const settingsDoc = doc(db, "users", currentUser.uid, "settings", "preferences");
      await setDoc(settingsDoc, { twoFactorEnabled: true, twoFactorSecret: secret }, { merge: true });
      setUserSettings((prev) => (prev ? { ...prev, twoFactorEnabled: true, twoFactorSecret: secret } : null));

      log.info("2FA enabled successfully", { uid: currentUser.uid });
      return { secret, qrCodeUrl };
    } catch (err: any) {
      const appErr = new AppError(
        "2FA enable failed",
        ERROR_CODES.UNKNOWN,
        { uid: currentUser.uid }
      );
      log.error("2FA enable failed", { errorId: appErr.errorId });
      throw new Error(`${t("error_tfa_failed")}: ${err.message}`);
    }
  };

  const verify2FA = async (code: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    log.info("2FA verification attempt", { uid: currentUser.uid });
    try {
      const normalizedCode = code.replace(/\s/g, "");

      const response = await fetch("http://localhost:3000/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
        body: JSON.stringify({ uid: currentUser.uid, token: normalizedCode }),
      });

      if (!response.ok) {
        throw new Error(t("error_tfa_verification"));
      }

      const result = await response.json();
      if (!result.success) {
        log.warn("2FA verification failed — invalid code", { uid: currentUser.uid });
        throw new Error(t("error_tfa_invalid"));
      }

      set2FAVerified(true);
      log.info("2FA verification successful", { uid: currentUser.uid });
    } catch (err: any) {
      const appErr = new AppError(
        "2FA verification failed",
        ERROR_CODES.UNKNOWN,
        { uid: currentUser.uid }
      );
      log.error("2FA verification error", { errorId: appErr.errorId });
      throw new Error(`${t("error_tfa_verification")}: ${err.message}`);
    }
  };

  const disable2FA = async () => {
    if (!currentUser) throw new Error(t("error_no_user"));
    log.info("2FA disable initiated", { uid: currentUser.uid });
    try {
      const settingsDoc = doc(db, "users", currentUser.uid, "settings", "preferences");
      await setDoc(settingsDoc, { twoFactorEnabled: false, twoFactorSecret: null }, { merge: true });
      setUserSettings((prev) => (prev ? { ...prev, twoFactorEnabled: false, twoFactorSecret: undefined } : null));
      set2FAVerified(false);
      log.info("2FA disabled successfully", { uid: currentUser.uid });
    } catch (err: any) {
      const appErr = new AppError(
        "2FA disable failed",
        ERROR_CODES.UNKNOWN,
        { uid: currentUser.uid }
      );
      log.error("2FA disable failed", { errorId: appErr.errorId });
      throw new Error(`${t("error_tfa_disable")}: ${err.message}`);
    }
  };

  // ─── Settings ─────────────────────────────────────────────────────────────

  const setLanguage = async (language: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    log.debug("Language setting update", { uid: currentUser.uid, language });
    try {
      const settingsDoc = doc(db, "users", currentUser.uid, "settings", "preferences");
      await setDoc(settingsDoc, { language }, { merge: true });
      setUserSettings((prev) => (prev ? { ...prev, language } : null));
      log.info("Language updated", { uid: currentUser.uid, language });
    } catch (err: any) {
      const appErr = new DataError(
        "Language update failed",
        ERROR_CODES.DATA_WRITE_FAILED,
        { uid: currentUser.uid }
      );
      log.error("Language update failed", { errorId: appErr.errorId });
      throw new Error(`${t("error_language_update")}: ${err.message}`);
    }
  };

  // ─── Delete account ───────────────────────────────────────────────────────

  const deleteAccount = async (password: string) => {
    if (!currentUser) throw new Error(t("error_no_user"));
    if (!currentUser.email) throw new Error(t("error_email_missing"));

    log.warn("Account deletion initiated — irreversible operation", {
      uid: currentUser.uid,
    });

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      const userDoc = doc(db, "users", currentUser.uid);
      await deleteDoc(userDoc);

      const settingsDoc = doc(db, "users", currentUser.uid, "settings", "preferences");
      await deleteDoc(settingsDoc);

      await deleteUser(currentUser);

      if (currentUser) {
        sessionStorage.removeItem(`2fa_verified_${currentUser.uid}`);
      }
      setUserProfile(null);
      setUserSettings(null);
      setIs2FAVerified(false);

      log.info("Account deleted successfully");
    } catch (err: any) {
      const appErr = fromFirebaseAuthError(err, {
        uid: currentUser.uid,
        operation: "deleteAccount",
      });
      log.error("Account deletion failed", { errorId: appErr.errorId, code: appErr.code });
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        userSettings,
        loading,
        is2FAVerified,
        set2FAVerified,
        logout,
        signInWithGoogle,
        signInWithFacebook,
        signInWithSteam,
        signInWithEmail,
        register,
        resetPassword,
        updateUserName,
        updateUserEmail,
        updateUserPassword,
        enable2FA,
        verify2FA,
        disable2FA,
        setLanguage,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}