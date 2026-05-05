# 🎮 GameStoreApp

A full-featured online game store built as a diploma project. The application allows users to browse, purchase, and manage games with a modern, responsive UI.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Build Tool | Vite |
| Backend & Auth | Firebase (Firestore, Auth, Functions, Hosting) |
| State Management | TanStack React Query |
| Payments | Stripe, PayPal |
| Forms | Formik + Yup |
| Animations | Framer Motion |
| i18n | i18next + react-i18next |
| Routing | React Router DOM v7 |
| PDF Generation | jsPDF + jspdf-autotable |
| Testing | Vitest, Playwright, Cucumber (BDD) |

---

## ✨ Features

- 🛒 Browse and purchase games
- 💳 Payment integration via **Stripe** and **PayPal**
- 🔐 User authentication via **Firebase Auth**
- 🌍 Multi-language support (i18n)
- 📄 PDF receipt / report generation
- 📱 Responsive design with Tailwind CSS
- 🔒 Google reCAPTCHA protection
- 📊 QR code generation
- 🎨 Smooth animations with Framer Motion

---

## 🏗️ Architecture

The application follows a **client-server architecture** with a React frontend and Firebase backend.

### Frontend Architecture
- **Component-based**: Modular React components with TypeScript for type safety.
- **Context API**: State management for cart, wishlist, library, and authentication.
- **Routing**: Client-side routing with React Router for SPA navigation.
- **Styling**: Utility-first CSS with Tailwind for responsive design.
- **Internationalization**: i18next for multi-language support.

### Backend Architecture
- **Firebase Services**: 
  - **Firestore**: NoSQL database for user data, games, and transactions.
  - **Auth**: User authentication with Steam OAuth.
  - **Functions**: Serverless functions for payment processing and API logic.
  - **Hosting**: Static site hosting for the frontend.
- **API**: RESTful endpoints for authentication, 2FA, and payments.

### Business Logic
- **User Management**: Registration via Steam, profile management, 2FA with TOTP.
- **Game Catalog**: Display games with prices, add to cart/wishlist.
- **Purchase Flow**: Secure payments via Stripe/PayPal, receipt generation.
- **Library Management**: Purchased games stored in user's library with receipts.

### Data Flow
1. User browses games on frontend.
2. Authentication via Steam OAuth, tokens managed by Firebase.
3. Cart/wishlist state persisted in localStorage and synced with Firestore.
4. Payments processed via Stripe/PayPal webhooks.
5. Purchase data stored in Firestore, receipts generated as PDF.

---

## 📁 Project Structure

```
.
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context providers (Auth, Cart, Library, Wishlist)
│   ├── pages/            # Route-level page components
│   └── utils/            # Utility functions and validation schemas
├── server/               # Firebase Cloud Functions
├── public/               # Static assets
├── features/             # Cucumber BDD feature files
├── locale/               # i18n translation files
├── docs/
│   ├── deployment.md     # Production deployment guide
│   ├── update.md         # Update & rollback guide
│   ├── backup.md         # Backup & restore guide
│   ├── linting.md        # ESLint configuration & rules
│   ├── generate_docs.md  # Documentation generation guide
│   ├── api/
│   │   └── openapi.yaml  # OpenAPI 3.0 API specification
│   └── scripts/          # Automation scripts
├── firebase.json         # Firebase configuration
└── vite.config.ts        # Vite configuration
```

---

## 📚 Documentation

- **API Docs**: OpenAPI/Swagger at `/api-docs` when server is running.
- **Component Docs**: TypeDoc generated docs in `docs/api/`.
- **Live Components**: Storybook at `npm run storybook`.
- **Tests as Docs**: Integration tests demonstrate component usage.

Run `npm run docs` to generate TypeDoc documentation.

---

## 🛠️ Developer Setup (Fresh Machine)

### Step 1 — Install Node.js
Download and install Node.js **v18 or higher** from https://nodejs.org (LTS version).
```bash
node --version   # v18.x.x or higher
npm --version
```

### Step 2 — Install Git
Download from https://git-scm.com.

### Step 3 — Install Firebase CLI
```bash
npm install -g firebase-tools
firebase --version
```

### Step 4 — Clone the Repository
```bash
git clone https://github.com/klim912/Diploma.git
cd Diploma
npm install
```

### Step 5 — Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### Step 6 — Start Development Server
```bash
npm run dev
# App opens at http://localhost:5173
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint errors |
| `npm run type-check` | TypeScript type checking |
| `npm run check` | Full code quality check |
| `npm run test` | Run unit tests |
| `npm run coverage` | Run tests with coverage |
| `npm run docs` | Generate JSDoc documentation |

---

## 📝 Code Documentation Standards

This project uses **JSDoc** for code documentation. All contributors must follow these rules:

### What to document

**Always document:**
- All exported functions, hooks, and components
- All TypeScript interfaces and types shared across files
- File-level module descriptions (`@fileoverview`)
- Complex business logic and algorithms (inline comments)

**Format for functions:**
```typescript
/**
 * Brief one-line description of what the function does.
 *
 * Longer explanation if needed (business logic, algorithm details).
 *
 * @param paramName - Description of the parameter
 * @returns Description of what is returned
 * @throws {ErrorType} When and why this error is thrown
 *
 * @example
 * myFunction('input') // → 'output'
 */
```

**Format for React components:**
```typescript
/**
 * ComponentName — brief description of the component's purpose.
 *
 * @component
 * @param props - {@link ComponentNameProps}
 *
 * @example
 * <ComponentName requiredProp="value" />
 */
```

**Format for interfaces:**
```typescript
/**
 * Describes what this type represents.
 *
 * @interface InterfaceName
 */
export interface InterfaceName {
  /** Description of this field */
  fieldName: string
}
```

### Rule: Update docs with code
> Any change to a public function's signature, parameters, or behavior **must** include a JSDoc update in the same commit.

### Generate documentation
```bash
npm run docs
# Output: docs/api/html/index.html
```

See [docs/generate_docs.md](docs/generate_docs.md) for full instructions.

### View API documentation
Open `docs/api/openapi.yaml` in https://editor.swagger.io or run:
```bash
npm run docs:api
```

---

## 🧪 Testing

**Unit / Component Tests** — Vitest + React Testing Library
```bash
npm run test
npm run coverage
```

**End-to-End Tests** — Playwright
```bash
npx playwright test
```

**BDD Tests** — Cucumber
```bash
npx cucumber-js
```

---

## 🚀 Deployment

See [docs/deployment.md](docs/deployment.md) for the full production deployment guide.

```bash
npm run build
firebase deploy
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.