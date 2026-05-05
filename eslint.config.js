import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsdoc from 'eslint-plugin-jsdoc'

export default tseslint.config(
  // ── Ignored paths ────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'server/**',
      'cucumber.cjs',
      'docs/**',
    ],
  },

  // ── Base JS + TS rules ───────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Main config ──────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsdoc': jsdoc,
    },
    rules: {
      // ── React Hooks ──────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ── TypeScript ───────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // ── JSDoc ────────────────────────────────────────────────
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'FunctionDeclaration',
            'MethodDefinition',
            'ClassDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
          ],
        },
      ],
      'jsdoc/require-description': 'warn',
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/no-undefined-types': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-param-name': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-returns-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],

      // ── Code quality ─────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'no-nested-ternary': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
    },
  },
)