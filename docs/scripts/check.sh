#!/bin/bash
# ============================================================
#  check.sh — комплексна перевірка якості коду GameStoreApp
#  Використання: ./docs/scripts/check.sh
# ============================================================

set -e

ERRORS=0
WARNINGS=0

echo "🔎 GameStoreApp — Code Quality Check"
echo "======================================"
echo ""

# ── 1. TypeScript type check ─────────────────────────────────
echo "1️⃣  TypeScript — статична типізація..."
if npx tsc --noEmit; then
  echo "   ✅ TypeScript: помилок не знайдено"
else
  echo "   ❌ TypeScript: знайдено помилки типізації"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ── 2. ESLint ────────────────────────────────────────────────
echo "2️⃣  ESLint — статичний аналіз коду..."
if npx eslint . --max-warnings 0 --format stylish; then
  echo "   ✅ ESLint: помилок не знайдено"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1 ]; then
    echo "   ❌ ESLint: знайдено помилки"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ⚠️  ESLint: знайдено попередження"
    WARNINGS=$((WARNINGS + 1))
  fi
fi
echo ""

# ── 3. Підсумок ──────────────────────────────────────────────
echo "======================================"
echo "📊 Підсумок перевірки:"
echo "   Помилки:      $ERRORS"
echo "   Попередження: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "❌ Перевірку НЕ пройдено. Виправте помилки перед комітом."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  Перевірку пройдено з попередженнями."
  exit 0
else
  echo "✅ Усі перевірки пройдено успішно!"
  exit 0
fi
