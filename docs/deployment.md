# Deployment Guide — GameStoreApp

Інструкція для release engineer / DevOps з розгортання GameStoreApp у виробничому середовищі.

---

## Архітектура системи

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│              Browser (React SPA)                        │
│         served via Firebase Hosting CDN                 │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                   FIREBASE PLATFORM                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Firebase   │  │  Firestore   │  │   Firebase    │  │
│  │  Hosting   │  │  (NoSQL DB)  │  │    Auth       │  │
│  │   (CDN)    │  │              │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐                     │
│  │  Firebase   │  │  Firebase    │                     │
│  │ Functions  │  │   Storage    │                     │
│  │ (Node.js)  │  │              │                     │
│  └─────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼────────┐
│    Stripe    │ │   PayPal    │ │  EmailJS     │
│  (Payments) │ │  (Payments) │ │  (Email)     │
└──────────────┘ └─────────────┘ └──────────────┘
```

**Компоненти системи:**

- **Firebase Hosting** — CDN-хостинг для статичного React SPA (немає традиційного веб-сервера)
- **Firestore** — хмарна NoSQL база даних (документи/колекції), традиційна СУБД відсутня
- **Firebase Auth** — сервіс автентифікації (Email/Password, Google OAuth)
- **Firebase Functions** — serverless Node.js функції для серверної логіки
- **Firebase Storage** — файлове сховище для зображень та медіафайлів
- **Stripe / PayPal** — зовнішні платіжні сервіси
- **Сервіси кешування** — кешування на рівні Firebase Hosting CDN (HTTP-заголовки)

> Оскільки проєкт повністю розгортається на платформі Firebase, традиційне налаштування VPS/сервера не потрібне.

---

## Вимоги до середовища розробника / CI-машини

### Апаратне забезпечення (машина для збірки)

| Параметр | Мінімум | Рекомендовано |
|---|---|---|
| Архітектура | x86-64 | x86-64 |
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8 GB |
| Диск | 10 GB вільного місця | 20 GB SSD |
| ОС | Windows 10 / Ubuntu 20.04 / macOS 12 | Ubuntu 22.04 LTS |

### Програмне забезпечення

| Програма | Версія | Призначення |
|---|---|---|
| Node.js | 18 LTS або вище | Runtime для збірки та Firebase Functions |
| npm | 9+ (входить у Node.js) | Менеджер пакетів |
| Firebase CLI | остання | Деплой на Firebase |
| Git | 2.x | Контроль версій |

### Мережеві вимоги

- Доступ до `*.firebase.google.com`, `*.firebaseio.com`
- Доступ до `registry.npmjs.org` (встановлення пакетів)
- Відкритий порт 443 (HTTPS) назовні

---

## Крок 1 — Підготовка Firebase проєкту

1. Увійти до [Firebase Console](https://console.firebase.google.com)
2. Створити або відкрити проєкт
3. Активувати сервіси:
   - **Authentication** → Sign-in method → Email/Password + Google
   - **Firestore Database** → Create database → Production mode
   - **Storage** → Get started
   - **Hosting** → Get started
   - **Functions** → Get started

---

## Крок 2 — Підготовка машини для деплою

```bash
# Встановити Node.js 18 LTS (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановити Firebase CLI
npm install -g firebase-tools

# Авторизуватись у Firebase
firebase login
```

---

## Крок 3 — Клонування та налаштування

```bash
git clone https://github.com/klim912/Diploma.git
cd Diploma
npm install
```

Створити файл `.env` з production-змінними:

```env
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_PAYPAL_CLIENT_ID=your_live_paypal_client_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

> ⚠️ Ніколи не комітити `.env` файл у репозиторій.

---

## Крок 4 — Збірка проєкту

```bash
npm run build
```

Результат збірки буде у папці `dist/`.

Перевірити збірку локально:
```bash
npm run preview
# відкрити http://localhost:4173
```

---

## Крок 5 — Деплой Firebase Functions

```bash
cd server
npm install
cd ..
firebase deploy --only functions
```

---

## Крок 6 — Деплой на Firebase Hosting

```bash
firebase deploy --only hosting
```

Або повний деплой усього:
```bash
firebase deploy
```

---

## Крок 7 — Налаштування Firestore Rules

У Firebase Console → Firestore → Rules вставити:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Крок 8 — Перевірка працездатності

Після деплою перевірити:

```bash
# 1. Сайт відкривається
curl -I https://your-project.web.app
# очікувати: HTTP/2 200

# 2. Firebase Hosting статус
firebase hosting:channel:list

# 3. Functions логи
firebase functions:log
```

Ручна перевірка у браузері:
- [ ] Головна сторінка відкривається
- [ ] Реєстрація / вхід працює
- [ ] Каталог ігор завантажується
- [ ] Кошик додає товари
- [ ] Сторінка оплати відкривається (Stripe/PayPal форма)
- [ ] Мова перемикається (i18n)
- [ ] Сайт коректно відображається на мобільному

---

## Конфігурація кешування (firebase.json)

Додати до `firebase.json` у секцію `hosting` для оптимального кешування:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```
