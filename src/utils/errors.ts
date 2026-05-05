/**
 * @fileoverview Класи помилок та утиліти обробки помилок для GameStore.
 *
 * Архітектурне рішення: всі помилки успадковуються від AppError,
 * що дозволяє єдиному ErrorBoundary та обробнику Firebase-помилок
 * відрізняти «наші» помилки від несподіваних runtime-виключень.
 *
 * @module utils/errors
 */

import { createLogger } from "./logger";

const log = createLogger("errors");

// ---------------------------------------------------------------------------
// Коди помилок
// ---------------------------------------------------------------------------

/**
 * Вичерпний список кодів помилок застосунку.
 * Кожен код унікально ідентифікує тип проблеми незалежно від мови UI.
 */
export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS:  "AUTH_001",
  AUTH_USER_NOT_FOUND:       "AUTH_002",
  AUTH_EMAIL_IN_USE:         "AUTH_003",
  AUTH_WEAK_PASSWORD:        "AUTH_004",
  AUTH_TOO_MANY_REQUESTS:    "AUTH_005",
  AUTH_SESSION_EXPIRED:      "AUTH_006",
  AUTH_STEAM_FAILED:         "AUTH_007",

  // Cart / Payments
  CART_ITEM_NOT_FOUND:       "CART_001",
  PAYMENT_STRIPE_FAILED:     "PAY_001",
  PAYMENT_PAYPAL_FAILED:     "PAY_002",
  PAYMENT_CANCELLED:         "PAY_003",

  // Data / Firestore
  DATA_FETCH_FAILED:         "DATA_001",
  DATA_WRITE_FAILED:         "DATA_002",
  DATA_NOT_FOUND:            "DATA_003",

  // Network
  NETWORK_OFFLINE:           "NET_001",
  NETWORK_TIMEOUT:           "NET_002",

  // Generic
  UNKNOWN:                   "GEN_001",
  VALIDATION:                "GEN_002",
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ---------------------------------------------------------------------------
// Базовий клас помилки
// ---------------------------------------------------------------------------

/**
 * Базова помилка застосунку GameStore.
 *
 * Несе в собі:
 * - унікальний `errorId` (наприклад, `ERR-1748000000000-a3f1`) для пошуку в логах
 * - `code` для локалізації та програмної обробки
 * - `context` з параметрами, що допомагають відтворити проблему
 * - `userMessage` — текст для показу кінцевому користувачу (без техдеталей)
 */
export class AppError extends Error {
  readonly errorId: string;
  readonly code: ErrorCode;
  readonly context: Record<string, unknown>;
  readonly userMessage: string;
  readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.UNKNOWN,
    context: Record<string, unknown> = {},
    userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
    this.errorId = `ERR-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")}`;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.userMessage = userMessage ?? "Сталася помилка. Спробуйте ще раз.";

    // Фіксуємо стек у логах одразу при створенні
    log.error(`[${this.errorId}] ${this.name}: ${message}`, {
      code,
      context,
      stack: this.stack,
    });
  }
}

// ---------------------------------------------------------------------------
// Спеціалізовані підкласи
// ---------------------------------------------------------------------------

/** Помилка автентифікації (Firebase Auth) */
export class AuthError extends AppError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, userMessage?: string) {
    super(message, code, context, userMessage);
    this.name = "AuthError";
  }
}

/** Помилка платіжної системи */
export class PaymentError extends AppError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message, code, context, "Помилка оплати. Перевірте дані картки або спробуйте інший спосіб оплати.");
    this.name = "PaymentError";
  }
}

/** Помилка мережі або Firestore */
export class DataError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.DATA_FETCH_FAILED, context?: Record<string, unknown>) {
    super(message, code, context, "Не вдалося завантажити дані. Перевірте з'єднання та оновіть сторінку.");
    this.name = "DataError";
  }
}

// ---------------------------------------------------------------------------
// Перетворення Firebase-помилок у AppError
// ---------------------------------------------------------------------------

/**
 * Перетворює сирі помилки Firebase Auth на типізовані `AuthError`.
 *
 * @param err - Помилка від Firebase SDK
 * @param context - Додатковий контекст (наприклад, email що використовувався)
 */
export function fromFirebaseAuthError(
  err: unknown,
  context: Record<string, unknown> = {}
): AuthError {
  const code = (err as { code?: string })?.code ?? "";

  const map: Record<string, { appCode: ErrorCode; userMessage: string }> = {
    "auth/user-not-found":        { appCode: ERROR_CODES.AUTH_USER_NOT_FOUND,       userMessage: "Користувача з таким email не знайдено." },
    "auth/wrong-password":        { appCode: ERROR_CODES.AUTH_INVALID_CREDENTIALS,  userMessage: "Невірний пароль. Спробуйте ще раз або скиньте пароль." },
    "auth/email-already-in-use":  { appCode: ERROR_CODES.AUTH_EMAIL_IN_USE,         userMessage: "Цей email вже зареєстровано. Увійдіть або скиньте пароль." },
    "auth/weak-password":         { appCode: ERROR_CODES.AUTH_WEAK_PASSWORD,        userMessage: "Пароль занадто простий. Використовуйте мінімум 6 символів." },
    "auth/too-many-requests":     { appCode: ERROR_CODES.AUTH_TOO_MANY_REQUESTS,    userMessage: "Забагато спроб. Зачекайте кілька хвилин та спробуйте знову." },
    "auth/id-token-expired":      { appCode: ERROR_CODES.AUTH_SESSION_EXPIRED,      userMessage: "Сесія закінчилася. Увійдіть ще раз." },
  };

  const mapped = map[code] ?? {
    appCode: ERROR_CODES.UNKNOWN,
    userMessage: "Помилка авторизації. Спробуйте пізніше.",
  };

  return new AuthError(
    `Firebase Auth error: ${code}`,
    mapped.appCode,
    { firebaseCode: code, ...context },
    mapped.userMessage
  );
}

// ---------------------------------------------------------------------------
// Глобальний обробник непійманих помилок
// ---------------------------------------------------------------------------

/**
 * Реєструє глобальні обробники для `window.onerror` та `unhandledrejection`.
 * Викликається один раз у `main.tsx`.
 *
 * @remarks
 * Усі непіймані помилки логуються з рівнем CRITICAL та отримують errorId.
 * Стек не показується кінцевому користувачу — тільки errorId для звернення до підтримки.
 */
export function registerGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    log.critical("Uncaught runtime error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    log.critical("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  log.info("Global error handlers registered", { sessionId: crypto.randomUUID() });
}
