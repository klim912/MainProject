#!/bin/bash
# ============================================================
#  deploy.sh — розгортання GameStoreApp у production
#  Використання: ./docs/scripts/deploy.sh
# ============================================================

set -e

echo "🚀 GameStoreApp — Production Deploy"
echo "====================================="

# ── Перевірки перед деплоєм ──────────────────────────────────
echo "🔍 Перевірка середовища..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js не встановлено"; exit 1
fi

if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI не встановлено. Запустіть: npm install -g firebase-tools"; exit 1
fi

if [ ! -f ".env" ]; then
  echo "❌ Файл .env не знайдено"; exit 1
fi

echo "✓ Node.js $(node -v)"
echo "✓ Firebase CLI $(firebase --version)"
echo "✓ .env знайдено"

# ── Встановлення залежностей ─────────────────────────────────
echo ""
echo "📦 Встановлення залежностей..."
npm install

echo "📦 Встановлення залежностей server/..."
cd server && npm install && cd ..

# ── Запуск тестів ────────────────────────────────────────────
echo ""
echo "🧪 Запуск тестів..."
npm run test -- --run
if [ $? -ne 0 ]; then
  echo "❌ Тести не пройшли. Деплой скасовано."
  exit 1
fi
echo "✓ Тести пройшли"

# ── Збірка ───────────────────────────────────────────────────
echo ""
echo "🏗️  Збірка проєкту..."
npm run build
echo "✓ Збірка завершена (папка dist/)"

# ── Деплой ───────────────────────────────────────────────────
echo ""
echo "☁️  Деплой на Firebase..."

# Functions
echo "  → Deploying Functions..."
firebase deploy --only functions

# Hosting
echo "  → Deploying Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Деплой успішно завершено!"
echo "   Сайт: https://$(firebase use --json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("result","your-project"))').web.app"
