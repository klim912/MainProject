import React, { Component, ErrorInfo, ReactNode } from "react";
import { createLogger } from "../utils/logger";
import { AppError } from "../utils/errors";

const log = createLogger("ErrorBoundary");

interface Props {
  children: ReactNode;
  /** Кастомний fallback-компонент (за замовчуванням — вбудована сторінка помилки) */
  fallback?: (errorId: string, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
  userMessage: string;
}

/**
 * Обгортає дерево компонентів та перехоплює render-помилки.
 *
 * @remarks
 * Логує помилку з унікальним `errorId`, показує зрозуміле повідомлення
 * користувачу та кнопку "Повідомити про проблему" з можливістю завантажити логи.
 *
 * **Взаємодія:** розміщується у `App.tsx` навколо `<AppRoutes/>`.
 * Також може обгортати окремі критичні секції (CartPage, CheckoutForm).
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <CartPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null, userMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = error instanceof AppError
      ? error.errorId
      : `ERR-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4,"0")}`;

    const userMessage = error instanceof AppError
      ? error.userMessage
      : "Сталася неочікувана помилка. Спробуйте оновити сторінку.";

    return { hasError: true, errorId, userMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.critical("React render error caught by ErrorBoundary", {
      errorId: this.state.errorId,
      errorName: error.name,
      errorMessage: error.message,
      componentStack: info.componentStack,
      stack: error.stack,
    });
  }

  reset = (): void => {
    this.setState({ hasError: false, errorId: null, userMessage: "" });
  };

  handleReport = (): void => {
    import("../utils/logger").then(({ downloadLogs }) => downloadLogs());
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.errorId!, this.reset);
    }

    return (
      <ErrorFallbackPage
        errorId={this.state.errorId!}
        userMessage={this.state.userMessage}
        onReset={this.reset}
        onReport={this.handleReport}
      />
    );
  }
}

// ---------------------------------------------------------------------------
// Вбудована сторінка помилки (без технічних деталей)
// ---------------------------------------------------------------------------

interface FallbackProps {
  errorId: string;
  userMessage: string;
  onReset: () => void;
  onReport: () => void;
}

/**
 * Сторінка помилки для кінцевого користувача.
 * Показує зрозуміле повідомлення, кроки дій та ID для звернення до підтримки.
 */
function ErrorFallbackPage({ errorId, userMessage, onReset, onReport }: FallbackProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-background-tertiary)",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: 480,
        background: "var(--color-background-primary)",
        borderRadius: 16,
        padding: "2.5rem",
        border: "1px solid var(--color-border-tertiary)",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>⚠️</div>

        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.75rem", color: "var(--color-text-primary)" }}>
          Щось пішло не так
        </h1>

        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          {userMessage}
        </p>

        {/* Action steps */}
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: 10,
          padding: "1rem 1.25rem",
          textAlign: "left",
          marginBottom: "1.5rem",
          fontSize: 14,
          color: "var(--color-text-secondary)",
        }}>
          <p style={{ fontWeight: 500, marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
            Що можна зробити:
          </p>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 2, margin: 0 }}>
            <li>Оновіть сторінку (F5 або Ctrl+R)</li>
            <li>Перевірте з'єднання з інтернетом</li>
            <li>Спробуйте увійти в акаунт знову</li>
            <li>Якщо проблема повторюється — зверніться до підтримки</li>
          </ul>
        </div>

        {/* Error ID for support */}
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: "1.5rem" }}>
          Код помилки для підтримки: <code style={{ fontFamily: "monospace" }}>{errorId}</code>
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onReset}
            style={{
              padding: "0.6rem 1.25rem",
              background: "var(--color-text-info)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Спробувати знову
          </button>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "0.6rem 1.25rem",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            На головну
          </button>
          <button
            onClick={onReport}
            style={{
              padding: "0.6rem 1.25rem",
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Завантажити звіт
          </button>
        </div>
      </div>
    </div>
  );
}
