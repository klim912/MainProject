#!/bin/bash
# ============================================================
#  backup.sh — резервне копіювання GameStoreApp
#  Використання: ./docs/scripts/backup.sh
#  Налаштування: встановити PROJECT_ID та BACKUP_BUCKET нижче
# ============================================================

set -e

PROJECT_ID="your-firebase-project-id"
BACKUP_BUCKET="gs://${PROJECT_ID}.appspot.com/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOCAL_BACKUP_DIR="./backups/${DATE}"

echo "💾 GameStoreApp — Backup"
echo "========================"
echo "Дата: ${DATE}"
echo ""

mkdir -p "${LOCAL_BACKUP_DIR}"

# ── Резервна копія Firestore ─────────────────────────────────
echo "📂 Резервна копія Firestore..."
if command -v gcloud &> /dev/null; then
  gcloud firestore export "${BACKUP_BUCKET}/${DATE}" --project="${PROJECT_ID}"
  echo "  ✓ Firestore → ${BACKUP_BUCKET}/${DATE}"
else
  echo "  ⚠️  gcloud CLI не встановлено. Пропускаємо Firestore backup."
fi

# ── Резервна копія конфігурацій ──────────────────────────────
echo ""
echo "⚙️  Резервна копія конфігурацій..."

if [ -f ".env" ]; then
  if command -v gpg &> /dev/null; then
    gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase "${BACKUP_PASSPHRASE:-changeme}" \
        --output "${LOCAL_BACKUP_DIR}/.env.gpg" .env
    echo "  ✓ .env → ${LOCAL_BACKUP_DIR}/.env.gpg (зашифровано)"
  else
    cp .env "${LOCAL_BACKUP_DIR}/.env.backup"
    echo "  ⚠️  gpg не встановлено. .env скопійовано БЕЗ шифрування!"
  fi
fi

cp firebase.json "${LOCAL_BACKUP_DIR}/firebase.json.backup"
cp .firebaserc "${LOCAL_BACKUP_DIR}/.firebaserc.backup" 2>/dev/null || true
echo "  ✓ firebase.json та .firebaserc скопійовано"

# ── Перевірка цілісності ─────────────────────────────────────
echo ""
echo "🔍 Перевірка цілісності..."

if [ -f "${LOCAL_BACKUP_DIR}/.env.gpg" ]; then
  SIZE=$(wc -c < "${LOCAL_BACKUP_DIR}/.env.gpg")
  if [ "$SIZE" -gt 0 ]; then
    echo "  ✓ .env.gpg: ${SIZE} bytes"
  else
    echo "  ❌ .env.gpg порожній!"
    exit 1
  fi
fi

if command -v gcloud &> /dev/null; then
  gsutil du -sh "${BACKUP_BUCKET}/${DATE}/" && echo "  ✓ Firestore backup перевірено"
fi

# ── Ротація старих бекапів (зберігати 4 тижні) ───────────────
echo ""
echo "🗑️  Ротація старих локальних бекапів (старше 28 днів)..."
find ./backups -maxdepth 1 -type d -mtime +28 -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Стару копії видалено"

echo ""
echo "✅ Резервне копіювання завершено!"
echo "   Локальний бекап: ${LOCAL_BACKUP_DIR}"
echo "   Cloud бекап:     ${BACKUP_BUCKET}/${DATE}"
