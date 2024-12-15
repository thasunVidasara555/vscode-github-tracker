module.exports = {
  root: true, // Important for monorepos
  env: {
      browser: true,
      es2021: true,
      node: true, // If you are using node features
  },
  extends: [
      'eslint:recommended', // Start with recommended rules
      // Add other recommended configs like 'airbnb-base' or 'plugin:react/recommended'
  ],
  parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // If you're using ES modules
  },
  rules: {
      // Add or override specific rules here
      'no-unused-vars': 'warn', // Example: Warn about unused variables
      'no-console': 'off' // Allow console logs
  },
};
