import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // JSX components (<Foo />) and React are used implicitly.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Context files export a hook and a provider; fine for this app.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
