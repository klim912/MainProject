/**
 * @fileoverview Серверне логування для Express (server/index.js).
 *
 * Використовує winston для:
 *  - Виводу в консоль (dev) з кольорами
 *  - Запису у файл logs/combined.log (JSON, ротація щодня або при 20MB)
 *  - Окремого файлу logs/error.log тільки для ERROR+
 *
 * Рівень логування задається через змінну середовища LOG_LEVEL
 * (без перекомпіляції: LOG_LEVEL=debug node server/index.js)
 *
 * @module server/logger
 */

// Залежності: npm install winston winston-daily-rotate-file
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// ---------------------------------------------------------------------------
// Формати
// ---------------------------------------------------------------------------

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/** Формат для консолі (читабельний) */
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, module, errorId, userId, sessionId, stack, ...rest }) => {
    const mod = module ? `[${module}]` : "";
    const eid = errorId ? ` {${errorId}}` : "";
    const uid = userId ? ` user:${userId}` : "";
    const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
    const stackLine = stack ? `\n${stack}` : "";
    return `${timestamp} ${level} ${mod}${eid}${uid}: ${message}${extras}${stackLine}`;
  })
);

/** Формат для файлів (JSON — зручно парсити) */
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ---------------------------------------------------------------------------
// Транспорти
// ---------------------------------------------------------------------------

const logsDir = path.join(__dirname, "../logs");

/**
 * Ротація combined.log:
 * - Новий файл щодня (або при перевищенні 20MB)
 * - Зберігається 14 днів
 * - Старі архіви стискаються gzip
 */
const combinedRotate = new DailyRotateFile({
  filename: path.join(logsDir, "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
  format: fileFormat,
});

/**
 * Окремий файл тільки для ERROR та вище.
 * Зберігається 30 днів.
 */
const errorRotate = new DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "10m",
  maxFiles: "30d",
  zippedArchive: true,
  format: fileFormat,
});

// ---------------------------------------------------------------------------
// Winston logger
// ---------------------------------------------------------------------------

/**
 * Глобальний серверний логер.
 *
 * Рівень визначається з `process.env.LOG_LEVEL` (DEBUG, INFO, WARN, ERROR).
 * Якщо змінна не задана — дефолт залежить від NODE_ENV:
 *   - development → "debug"
 *   - production  → "warn"
 */
const serverLogger = winston.createLogger({
  level: process.env.LOG_LEVEL?.toLowerCase()
    ?? (process.env.NODE_ENV === "production" ? "warn" : "debug"),

  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    combinedRotate,
    errorRotate,
  ],
});

// ---------------------------------------------------------------------------
// Express middleware: логування запитів
// ---------------------------------------------------------------------------

/**
 * Middleware що логує кожен HTTP-запит та відповідь.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Next function
 *
 * @example
 * ```js
 * app.use(requestLogger);
 * ```
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")}`;

  // Прикріплюємо requestId до req для використання в обробниках маршрутів
  req.requestId = requestId;

  serverLogger.info("Incoming request", {
    module: "HTTP",
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error"
      : res.statusCode >= 400 ? "warn"
      : "info";

    serverLogger[level]("Request completed", {
      module: "HTTP",
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}

// ---------------------------------------------------------------------------
// Express middleware: централізована обробка помилок
// ---------------------------------------------------------------------------

/**
 * Express error handler middleware (4 параметри — обов'язково).
 * Розміщується ПІСЛЯ всіх маршрутів.
 *
 * @example
 * ```js
 * app.use(errorHandler);
 * ```
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const errorId = `ERR-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")}`;
  const statusCode = err.statusCode ?? err.status ?? 500;

  serverLogger.error("Unhandled server error", {
    module: "ErrorHandler",
    errorId,
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    statusCode,
  });

  // Відповідь клієнту — без стеку, тільки errorId
  res.status(statusCode).json({
    success: false,
    errorId,
    message: statusCode >= 500
      ? "Внутрішня помилка сервера. Зверніться до підтримки з кодом помилки."
      : err.message ?? "Помилка запиту",
  });
}

// ---------------------------------------------------------------------------
// Endpoint для прийому логів з фронтенду
// ---------------------------------------------------------------------------

/**
 * POST /api/logs — приймає LogEntry від фронтенду (ERROR та CRITICAL).
 *
 * @example
 * ```js
 * app.post("/api/logs", receiveFrontendLog);
 * ```
 */
function receiveFrontendLog(req, res) {
  const entry = req.body;

  if (!entry || !entry.level || !entry.message) {
    return res.status(400).json({ error: "Invalid log entry" });
  }

  // Перелогіруємо від імені фронтенду
  const level = ["error", "critical"].includes(entry.level?.toLowerCase())
    ? "error" : "warn";

  serverLogger[level](`[FRONTEND] ${entry.message}`, {
    module: entry.module ?? "frontend",
    errorId: entry.errorId,
    userId: entry.userId,
    sessionId: entry.sessionId,
    frontendTimestamp: entry.timestamp,
    context: entry.context,
  });

  res.status(204).end();
}

module.exports = { serverLogger, requestLogger, errorHandler, receiveFrontendLog };
