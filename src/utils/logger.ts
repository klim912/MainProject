/**
 * @fileoverview Система логування для GameStore (фронтенд).
 *
 * Підтримує рівні DEBUG / INFO / WARN / ERROR / CRITICAL.
 * Мінімальний рівень задається через змінну середовища VITE_LOG_LEVEL
 * (без перекомпіляції — достатньо змінити .env та перезапустити dev-сервер;
 *  у production збірці значення вбудовується під час build-у).
 *
 * @module utils/logger
 */

/** Числові пріоритети рівнів — чим вище, тим важливіше. */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Структура одного запису лога.
 * Зберігається локально та відправляється на сервер для ERROR/CRITICAL.
 */
export interface LogEntry {
  /** ISO-рядок часу події */
  timestamp: string;
  /** Рівень серйозності */
  level: LogLevel;
  /** Назва модуля, що генерує лог */
  module: string;
  /** Текст повідомлення */
  message: string;
  /** Довільні додаткові дані */
  context?: Record<string, unknown>;
  /** Унікальний ідентифікатор помилки (тільки для ERROR/CRITICAL) */
  errorId?: string;
  /** ID поточного користувача Firebase (якщо авторизований) */
  userId?: string | null;
  /** ID сесії браузера */
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Конфігурація
// ---------------------------------------------------------------------------

/**
 * Мінімальний рівень логування.
 * Читається з VITE_LOG_LEVEL або з localStorage (для динамічної зміни у dev).
 *
 * @remarks
 * Порядок пріоритету:
 * 1. localStorage.getItem('LOG_LEVEL')  ← розробник може змінити у DevTools
 * 2. import.meta.env.VITE_LOG_LEVEL     ← файл .env / .env.production
 * 3. 'WARN'                             ← захисний дефолт
 */
function resolveLogLevel(): LogLevel {
  const fromStorage = typeof localStorage !== "undefined"
    ? (localStorage.getItem("LOG_LEVEL") as LogLevel | null)
    : null;
  const fromEnv = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined;
  const candidate = fromStorage ?? fromEnv ?? "WARN";
  return candidate in LOG_LEVELS ? candidate : "WARN";
}

let currentLevel: LogLevel = resolveLogLevel();

/**
 * Змінює поточний рівень логування під час виконання.
 * Зміна зберігається в localStorage і переживає перезавантаження сторінки.
 *
 * @param level - Новий рівень
 * @example
 * ```ts
 * // У DevTools:
 * import { setLogLevel } from './utils/logger';
 * setLogLevel('DEBUG');
 * ```
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("LOG_LEVEL", level);
  }
}

// ---------------------------------------------------------------------------
// Внутрішні утиліти
// ---------------------------------------------------------------------------

/** Унікальний ідентифікатор сесії браузера (живе до закриття вкладки) */
const SESSION_ID = crypto.randomUUID();

/** Буфер останніх 100 записів (для передачі при репорті) */
const LOG_BUFFER: LogEntry[] = [];
const BUFFER_SIZE = 100;

/**
 * Генерує унікальний ID помилки у форматі ERR-{timestamp}-{hex4}.
 * Дозволяє відрізнити одне виникнення помилки від іншого.
 */
function generateErrorId(): string {
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `ERR-${Date.now()}-${hex}`;
}

/** CSS-кольори для консолі браузера */
const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG:    "color:#888;font-weight:normal",
  INFO:     "color:#0ea5e9;font-weight:normal",
  WARN:     "color:#f59e0b;font-weight:bold",
  ERROR:    "color:#ef4444;font-weight:bold",
  CRITICAL: "color:#fff;background:#dc2626;font-weight:bold;padding:2px 6px;border-radius:3px",
};

/** Читає поточний userId з AuthContext (через DOM-атрибут, якщо доступно) */
function getCurrentUserId(): string | null {
  try {
    return sessionStorage.getItem("gs_uid") ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Основна функція запису
// ---------------------------------------------------------------------------

function writeLog(
  level: LogLevel,
  module: string,
  message: string,
  context?: Record<string, unknown>
): LogEntry | null {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return null;

  const isError = level === "ERROR" || level === "CRITICAL";
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    context,
    errorId: isError ? generateErrorId() : undefined,
    userId: getCurrentUserId(),
    sessionId: SESSION_ID,
  };

  // --- Консоль ---
  const prefix = `%c[${entry.level}] [${entry.timestamp}] [${module}]`;
  const style = LEVEL_STYLES[level];
  if (context) {
    console[level === "DEBUG" ? "debug" : level === "INFO" ? "info" : level === "WARN" ? "warn" : "error"](
      prefix, style, message, { errorId: entry.errorId, ...context }
    );
  } else {
    console[level === "DEBUG" ? "debug" : level === "INFO" ? "info" : level === "WARN" ? "warn" : "error"](
      prefix, style, message
    );
  }

  // --- Буфер ---
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > BUFFER_SIZE) LOG_BUFFER.shift();

  // --- Відправка на сервер для ERROR/CRITICAL ---
  if (isError) {
    sendToServer(entry).catch(() => {
      // Тихе падіння: якщо сервер недоступний — не ламаємо UI
    });
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Відправка логів на сервер (ERROR+)
// ---------------------------------------------------------------------------

/**
 * Надсилає запис лога на серверний endpoint POST /api/logs.
 * Використовує `navigator.sendBeacon` якщо доступний (не блокує unload).
 */
async function sendToServer(entry: LogEntry): Promise<void> {
  const payload = JSON.stringify(entry);
  const url = "/api/logs";

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return;
  }

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

// ---------------------------------------------------------------------------
// Публічний API логера
// ---------------------------------------------------------------------------

/**
 * Фабрика, що повертає логер для конкретного модуля.
 *
 * @param module - Назва модуля (наприклад `'AuthContext'`, `'CartPage'`)
 * @returns Об'єкт із методами `debug`, `info`, `warn`, `error`, `critical`
 *
 * @example
 * ```ts
 * const log = createLogger('CartContext');
 * log.info('Item added', { gameId: '123', price: 29.99 });
 * log.error('Failed to load cart', { reason: err.message });
 * ```
 */
export function createLogger(module: string) {
  return {
    debug:    (msg: string, ctx?: Record<string, unknown>) => writeLog("DEBUG",    module, msg, ctx),
    info:     (msg: string, ctx?: Record<string, unknown>) => writeLog("INFO",     module, msg, ctx),
    warn:     (msg: string, ctx?: Record<string, unknown>) => writeLog("WARN",     module, msg, ctx),
    error:    (msg: string, ctx?: Record<string, unknown>) => writeLog("ERROR",    module, msg, ctx),
    critical: (msg: string, ctx?: Record<string, unknown>) => writeLog("CRITICAL", module, msg, ctx),
  };
}

/**
 * Повертає копію буфера останніх логів (для репортів та дебагу).
 */
export function getLogBuffer(): readonly LogEntry[] {
  return [...LOG_BUFFER];
}

/**
 * Зберігає весь буфер логів у файл (тільки у dev / за запитом користувача).
 */
export function downloadLogs(): void {
  const content = LOG_BUFFER.map((e) => JSON.stringify(e)).join("\n");
  const blob = new Blob([content], { type: "application/jsonl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gamestore-logs-${Date.now()}.jsonl`;
  a.click();
}
