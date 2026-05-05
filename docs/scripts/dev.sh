#!/bin/bash
# ============================================================
#  dev.sh — запуск середовища розробки GameStoreApp
#  Використання: ./docs/scripts/dev.sh
# ============================================================

set -e

echo "🎮 GameStoreApp — Dev Environment"
echo "=================================="

# ── Перевірка Node.js ────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌ Node.js не встановлено. Встановіть з https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Потрібен Node.js 18+. Поточна версія: $(node -v)"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# ── Перевірка .env ───────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "❌ Файл .env не знайдено. Створіть його за прикладом у README.md"
  exit 1
fi
echo "✓ .env знайдено"

# ── Встановлення залежностей ─────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦 Встановлення залежностей..."
  npm install
else
  echo "✓ node_modules існує"
fi

# ── Запуск Firebase Emulators (окремий термінал) ─────────────
if command -v firebase &> /dev/null; then
  echo "🔥 Запуск Firebase Emulators у фоні..."
  firebase emulators:start --only auth,firestore,functions &
  EMULATOR_PID=$!
  echo "  Emulator UI: http://localhost:4000"
  sleep 3
else
  echo "⚠️  Firebase CLI не встановлено. Емулятори не запущено."
fi

# ── Запуск Vite dev server ───────────────────────────────────
echo ""
echo "🚀 Запуск Vite dev server..."
echo "  App: http://localhost:5173"
echo ""
npm run dev

# ── Зупинка емуляторів при виході ───────────────────────────
if [ -n "$EMULATOR_PID" ]; then
  kill $EMULATOR_PID 2>/dev/null || true
fi
