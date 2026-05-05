# Linting & Static Analysis — GameStoreApp

Документація з налаштування статичного аналізу коду для проєкту GameStoreApp.

---

## Обраний лінтер та причини вибору

### ESLint + TypeScript ESLint

**ESLint** є стандартним лінтером для JavaScript/TypeScript екосистеми. Для проєкту на React + TypeScript обрано такий набір інструментів:

| Інструмент | Призначення |
|---|---|
| `eslint` | Базовий статичний аналіз JS/TS |
| `typescript-eslint` | TypeScript-специфічні правила та парсер |
| `eslint-plugin-react-hooks` | Перевірка правил React Hooks |
| `eslint-plugin-react-refresh` | Перевірка коректності HMR (Vite) |
| `tsc --noEmit` | Статична типізація TypeScript |

**Причини вибору ESLint:**
- Найпоширеніший лінтер для React/TypeScript проєктів
- Вже встановлений у проєкті (`eslint.config.js` існував)
- Підтримує Flat Config (ESLint v9) — сучасний формат конфігурації
- Легко інтегрується з Vite, Husky та CI/CD
- Велика кількість плагінів під конкретний стек

---

## Аспекти якості коду

Для GameStoreApp найважливіші такі аспекти:

1. **Типова безпека** — `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`
2. **Коректність React Hooks** — `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`
3. **Невикористані змінні** — `@typescript-eslint/no-unused-vars`
4. **Безпека** — `eqeqeq` (заборона `==`), `no-debugger`, `no-var`
5. **Читабельність** — `prefer-const`, `prefer-template`, `no-console`

---

## Конфігурація — `eslint.config.js`

Проєкт використовує **ESLint Flat Config** (файл `eslint.config.js`).

### Ключові правила та їх пояснення

```js
// Невикористані змінні — error, але дозволяємо _prefix для навмисного ігнорування
'@typescript-eslint/no-unused-vars': ['error', {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_'
}]

// any — warn, не error, бо проєкт містить сторонні бібліотеки без типів
'@typescript-eslint/no-explicit-any': 'warn'

// Type imports — warn: краще писати import type { Foo } замість import { Foo }
'@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }]

// console.log — warn (дозволяємо console.warn та console.error для продакшну)
'no-console': ['warn', { allow: ['warn', 'error'] }]

// Заборона == на користь ===
'eqeqeq': ['error', 'always']

// Заборона var на користь let/const
'no-var': 'error'

// prefer-const: якщо змінна не переприсвоюється — має бути const
'prefer-const': 'error'
```

### Файли що ігноруються

```js
ignores: [
  'dist/**',        // зібраний код
  'build/**',       // альтернативна папка збірки
  'coverage/**',    // звіти покриття тестами
  'node_modules/**',
  'server/node_modules/**',
  '*.config.js',    // конфігураційні файли (vite.config, etc.)
  '*.config.ts',
  'docs/**',        // документація
]
```

---

## Інструкція з запуску лінтера

### Перевірка всього проєкту

```bash
npm run lint
```

### Автоматичне виправлення

```bash
npm run lint:fix
```

### Перевірка конкретного файлу або папки

```bash
npx eslint src/components/Cart.tsx
npx eslint src/pages/
```

### Статична типізація TypeScript

```bash
npm run type-check
```

### Комплексна перевірка (TypeScript + ESLint)

```bash
npm run check
```

Або через скрипт:
```bash
./docs/scripts/check.sh
```

---

## Результат первинного запуску лінтера

Після налаштування правил було запущено:

```bash
npx eslint . --format stylish 2>&1 | tee lint-report.txt
```

### Типові знайдені проблеми

| # | Правило | Тип | Опис |
|---|---|---|---|
| 1 | `@typescript-eslint/no-unused-vars` | error | Невикористані імпорти та змінні |
| 2 | `@typescript-eslint/no-explicit-any` | warn | Використання типу `any` |
| 3 | `no-console` | warn | Залишені `console.log` у компонентах |
| 4 | `prefer-const` | error | `let` замість `const` для незмінних значень |
| 5 | `eqeqeq` | error | Використання `==` замість `===` |
| 6 | `@typescript-eslint/consistent-type-imports` | warn | `import { Type }` замість `import type { Type }` |

### Як виправити 50% та 90% проблем

Для досягнення 50% виправлень:
```bash
# Автовиправлення (виправляє ~40-60% автоматично)
npm run lint:fix
# Порівняти кількість warnings/errors до і після
npx eslint . --format json | python3 -c "
import sys, json
data = json.load(sys.stdin)
errors = sum(f['errorCount'] for f in data)
warns  = sum(f['warningCount'] for f in data)
print(f'Errors: {errors}, Warnings: {warns}, Total: {errors+warns}')
"
```

Для досягнення 90% — після `--fix` вручну виправити помилки типу `any`, невикористані змінні та помилки `eqeqeq` у файлах `src/`.

---

## Git Hooks

Використовується **Husky** + **lint-staged** для запуску лінтера перед кожним комітом.

### Встановлення

```bash
# Встановити husky та lint-staged
npm install --save-dev husky lint-staged

# Ініціалізувати husky
npx husky init
```

### Конфігурація `.husky/pre-commit`

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."
npx lint-staged
npm run type-check
echo "✅ Pre-commit checks passed!"
```

### Конфігурація `.lintstagedrc.json`

```json
{
  "*.{ts,tsx}": [
    "eslint --fix --max-warnings 0",
    "tsc --noEmit --skipLibCheck"
  ],
  "*.{js,jsx}": [
    "eslint --fix --max-warnings 0"
  ]
}
```

**Принцип роботи:** `lint-staged` перевіряє лише файли що додані в `git add` (staged), а не весь проєкт — це значно пришвидшує перевірку.

---

## Інтеграція з процесом збірки

До скриптів у `package.json` додано:

```json
{
  "scripts": {
    "lint":       "eslint . --max-warnings 0",
    "lint:fix":   "eslint . --fix",
    "type-check": "tsc --noEmit",
    "check":      "npm run type-check && npm run lint",
    "build":      "tsc -b && vite build"
  }
}
```

Команда `build` вже включає `tsc -b` — це означає, що збірка **не пройде** при наявності TypeScript-помилок. Додатково перед деплоєм рекомендовано запускати `npm run check`.

### Інтеграція у GitHub Actions

У файлі `.github/workflows/deploy.yml` (вже створений у `docs/scripts/firebase-deploy.yml`) додано крок:

```yaml
- name: Run linter
  run: npm run lint

- name: Type check
  run: npm run type-check
```

Це гарантує, що код з помилками лінтингу **не потрапить у production**.

---

## Статична типізація TypeScript

Проєкт використовує TypeScript 5.7 з конфігурацією `tsconfig.app.json`.

### Запуск перевірки типів

```bash
# Перевірка без компіляції (лише типи)
npm run type-check

# Або напряму
npx tsc --noEmit
```

### Ключові параметри `tsconfig.app.json`

| Параметр | Значення | Ефект |
|---|---|---|
| `strict` | `true` | Вмикає всі суворі перевірки TypeScript |
| `noUnusedLocals` | `true` | Помилка для невикористаних локальних змінних |
| `noUnusedParameters` | `true` | Помилка для невикористаних параметрів функцій |
| `noFallthroughCasesInSwitch` | `true` | Помилка для switch без break |

### Рекомендовані практики

```typescript
// ❌ Погано — any знімає всі переваги TypeScript
const data: any = await fetch('/api/games')

// ✅ Добре — явний тип
interface Game { id: string; title: string; price: number }
const data: Game[] = await fetch('/api/games').then(r => r.json())

// ❌ Погано — non-null assertion без впевненості
const el = document.getElementById('app')!

// ✅ Добре — явна перевірка
const el = document.getElementById('app')
if (!el) throw new Error('App element not found')
```
