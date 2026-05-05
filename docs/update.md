# Update Guide — GameStoreApp

Покрокова інструкція для release engineer / DevOps з оновлення GameStoreApp у виробничому середовищі.

---

## Підготовка до оновлення

### 1. Перевірка поточної версії

```bash
# Переглянути поточний тег у репозиторії
git fetch --tags
git describe --tags --abbrev=0

# Переглянути останній деплой у Firebase
firebase hosting:channel:list
```

### 2. Перевірка сумісності

Перед оновленням перевірити:

- [ ] Переглянути `CHANGELOG` або повідомлення комітів між версіями:
  ```bash
  git log v1.0.0..v2.0.0 --oneline
  ```
- [ ] Перевірити зміни у `package.json` — чи змінились версії залежностей
- [ ] Перевірити зміни у `.env` — чи з'явились нові змінні середовища
- [ ] Перевірити зміни у `firebase.json` — чи змінилась конфігурація Firebase
- [ ] Перевірити зміни у Firestore Rules — чи потрібна міграція даних

### 3. Резервне копіювання перед оновленням

```bash
# Зробити резервну копію Firestore (див. backup.md)
./docs/scripts/backup.sh

# Зафіксувати поточний стан деплою
firebase hosting:channel:list > backup_channels_$(date +%Y%m%d).txt
```

### 4. Планування часу простою

GameStoreApp розгорнутий на Firebase Hosting з нульовим часом простою (zero-downtime deployment). Firebase атомарно перемикає версії, тому:

- **Фронтенд** — оновлення без простою (Firebase Hosting preview channels)
- **Firebase Functions** — оновлення без простою (Firebase поступово замінює інстанси)
- **Firestore** — міграції даних виконувати у низьконавантажений час (нічні години)

---

## Процес оновлення

### Крок 1 — Отримати нову версію коду

```bash
cd Diploma
git fetch origin
git checkout main
git pull origin main

# Або перейти на конкретний тег
git checkout v2.0.0
```

### Крок 2 — Оновити залежності

```bash
npm install
```

Якщо є зміни у `server/`:
```bash
cd server && npm install && cd ..
```

### Крок 3 — Оновити змінні середовища

Перевірити `.env` і додати нові змінні якщо вони з'явились у новій версії:

```bash
# Порівняти з прикладом (якщо є .env.example)
diff .env .env.example
```

### Крок 4 — Міграція даних Firestore (якщо потрібно)

Якщо нова версія змінює структуру даних у Firestore:

```bash
# Запустити скрипт міграції (якщо є)
node docs/scripts/migrate.js

# Оновити Firestore Security Rules
firebase deploy --only firestore:rules
```

### Крок 5 — Збірка нової версії

```bash
npm run build
```

Перевірити збірку:
```bash
npm run preview
```

### Крок 6 — Деплой у production

```bash
# Деплой лише хостингу
firebase deploy --only hosting

# Деплой Functions (якщо змінились)
firebase deploy --only functions

# Або повний деплой
firebase deploy
```

### Крок 7 — Перевірка після оновлення

```bash
# Переглянути логи Functions
firebase functions:log --only 20

# Перевірити HTTP статус
curl -I https://your-project.web.app
```

Ручна перевірка:
- [ ] Головна сторінка завантажується
- [ ] Авторизація працює
- [ ] Каталог ігор відображається
- [ ] Оплата проходить (тестова транзакція)
- [ ] Немає помилок у консолі браузера (F12)

---

## Процедура відкату (Rollback)

Firebase Hosting зберігає всі попередні деплої, що дозволяє миттєво відкотитись.

### Варіант 1 — Rollback через Firebase CLI (рекомендовано)

```bash
# Переглянути список деплоїв
firebase hosting:releases:list

# Відкотитись до попереднього деплою
# Взяти VERSION_ID з виводу попередньої команди
firebase hosting:clone your-project:live your-project:live --version VERSION_ID
```

### Варіант 2 — Rollback через Firebase Console

1. Відкрити https://console.firebase.google.com
2. Перейти: Hosting → Release history
3. Знайти попередню версію
4. Натиснути **"Rollback to this release"**

### Варіант 3 — Rollback через git + повторний деплой

```bash
# Повернутись до попереднього тегу
git checkout v1.0.0
npm install
npm run build
firebase deploy --only hosting
```

### Rollback Firebase Functions

```bash
# Переглянути попередні версії Functions
gcloud functions list --project your-project-id

# Відкотити конкретну функцію
git checkout v1.0.0 -- server/
cd server && npm install && cd ..
firebase deploy --only functions
```

### Rollback Firestore Rules

```bash
# Відновити попередні правила з git
git checkout v1.0.0 -- firestore.rules
firebase deploy --only firestore:rules
```

> ⚠️ **Дані у Firestore не відкочуються автоматично.** Якщо міграція даних виконувалась, відновити дані з резервної копії згідно [backup.md](backup.md).
