import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { registerGlobalErrorHandlers } from "./utils/errors.ts";
import { createLogger } from "./utils/logger.ts";

// ─── 1. Реєструємо глобальні обробники ПЕРШИМИ (до рендеру React) ──────────
registerGlobalErrorHandlers();

// ─── 2. Логуємо запуск застосунку ──────────────────────────────────────────
const log = createLogger("App");
log.info("GameStore starting", {
  version: import.meta.env.VITE_APP_VERSION ?? "dev",
  mode: import.meta.env.MODE,
  logLevel: import.meta.env.VITE_LOG_LEVEL ?? "WARN",
});

// ─── 3. Рендеримо з ErrorBoundary ──────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);