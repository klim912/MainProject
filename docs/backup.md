# Backup & Restore Guide — GameStoreApp

Інструкція з резервного копіювання та відновлення GameStoreApp.

---

## Стратегія резервного копіювання

### Що потребує резервного копіювання

| Компонент | Тип даних | Критичність |
|---|---|---|
| Firestore | Дані користувачів, замовлення, каталог ігор | 🔴 Критична |
| Firebase Storage | Зображення ігор, аватари | 🟡 Висока |
| Файли конфігурації | `.env`, `firebase.json` | 🔴 Критична |
| Вихідний код | Git-репозиторій | 🟢 GitHub зберігає |

### Типи резервних копій

- **Повна (Full)** — повний експорт Firestore + Storage щотижня
- **Інкрементальна** — Firestore автоматично веде журнал змін (Point-in-time recovery)
- **Конфігураційна** — резервна копія `.env` та конфігів після кожної зміни

### Частота резервного копіювання

| Тип | Частота | Зберігання |
|---|---|---|
| Повна копія Firestore | Щотижня (неділя 03:00) | 4 тижні |
| Конфіги (.env) | Після кожної зміни | Безстроково (зашифровано) |
| Storage | Щомісяця | 3 місяці |

---

## Процедура резервного копіювання

### Резервна копія Firestore

#### Вручну через Firebase CLI

```bash
# Встановити gcloud CLI якщо не встановлено
# https://cloud.google.com/sdk/docs/install

# Авторизуватись
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Створити повний експорт Firestore до Google Cloud Storage
gcloud firestore export gs://YOUR_PROJECT_ID.appspot.com/backups/$(date +%Y%m%d)

# Перевірити що бекап створено
gsutil ls gs://YOUR_PROJECT_ID.appspot.com/backups/
```

#### Автоматично через Firebase Functions (рекомендовано)

Додати до `server/index.js`:

```javascript
const { onSchedule } = require("firebase-functions/v2/scheduler");
const firestore = require("@google-cloud/firestore");

exports.scheduledBackup = onSchedule("every sunday 03:00", async () => {
  const client = new firestore.v1.FirestoreAdminClient();
  const projectId = process.env.GCLOUD_PROJECT;
  const databaseName = client.databasePath(projectId, "(default)");
  const bucket = `gs://${projectId}.appspot.com/backups/${new Date().toISOString().split('T')[0]}`;

  await client.exportDocuments({ name: databaseName, outputUriPrefix: bucket });
  console.log(`Backup completed to ${bucket}`);
});
```

```bash
firebase deploy --only functions:scheduledBackup
```

### Резервна копія файлів конфігурації

```bash
# Зашифрувати та зберегти .env
gpg --symmetric --cipher-algo AES256 .env
# Зберегти .env.gpg у захищеному місці (не в git!)

# Зберегти firebase.json та .firebaserc
cp firebase.json firebase.json.backup.$(date +%Y%m%d)
cp .firebaserc .firebaserc.backup.$(date +%Y%m%d)
```

### Резервна копія Firebase Storage

```bash
# Скопіювати всі файли з Storage до локальної папки
gsutil -m cp -r gs://YOUR_PROJECT_ID.appspot.com ./storage_backup_$(date +%Y%m%d)
```

### Перевірка цілісності резервних копій

```bash
# Перевірити що бекап Firestore не порожній
gsutil ls -l gs://YOUR_PROJECT_ID.appspot.com/backups/$(date +%Y%m%d)/

# Перевірити розмір бекапу (має бути > 0)
gsutil du -sh gs://YOUR_PROJECT_ID.appspot.com/backups/$(date +%Y%m%d)/
```

---

## Автоматизація резервного копіювання

Використовувати скрипт `docs/scripts/backup.sh` (див. нижче).

Налаштувати cron (Linux/macOS):
```bash
# Відкрити crontab
crontab -e

# Додати запис — щонеділі о 03:00
0 3 * * 0 /path/to/Diploma/docs/scripts/backup.sh >> /var/log/gamestore_backup.log 2>&1
```

---

## Процедура відновлення

### Повне відновлення Firestore

```bash
# Переглянути доступні бекапи
gsutil ls gs://YOUR_PROJECT_ID.appspot.com/backups/

# Відновити з конкретного бекапу
gcloud firestore import gs://YOUR_PROJECT_ID.appspot.com/backups/20250601

# ⚠️ Це перезапише поточні дані!
```

### Вибіркове відновлення (окремі колекції)

```bash
# Відновити лише колекцію orders
gcloud firestore import gs://YOUR_PROJECT_ID.appspot.com/backups/20250601 \
  --collection-ids=orders
```

### Відновлення конфігурації

```bash
# Розшифрувати .env
gpg --decrypt .env.gpg > .env
```

### Відновлення Storage

```bash
# Відновити файли зі Storage бекапу
gsutil -m cp -r ./storage_backup_20250601/* gs://YOUR_PROJECT_ID.appspot.com/
```

### Тестування відновлення

Після відновлення обов'язково перевірити:

```bash
# Перевірити кількість документів у Firestore
# (через Firebase Console → Firestore → переглянути колекції)

# Перевірити що застосунок запускається
npm run dev

# Перевірити авторизацію та дані у браузері
```
