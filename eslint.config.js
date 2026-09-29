// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Expo/React Native animation refs are intentionally read for Animated styles.
      'react-hooks/refs': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]);
