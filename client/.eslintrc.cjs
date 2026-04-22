module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true }, // Added node for commonJS modules if any
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime', // For new JSX transform
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'prettier', // Make sure prettier is last
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'prettier', 'import', 'jsx-a11y', 'react-hooks'],
  rules: {
    'prettier/prettier': ['warn', {}, { usePrettierrc: true }], // Use .prettierrc settings
    // 'react/react-in-jsx-scope': 'off', // Already off with jsx-runtime
    'react/prop-types': 'off', // We are using JS, prop-types are good but not enforced by default here
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn for unused vars
    // Add other rules as needed
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
  ignorePatterns: ['dist', 'node_modules', '.env', '.env.*', '*.html'],
};