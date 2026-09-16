// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

/**
 * Dependencies point inwards: presentation → application → domain, with
 * infrastructure plugged in only at the composition root. These rules make that
 * a build error rather than a convention someone has to remember.
 */
const forbid = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: patterns.map((group) => ({ group, message })) }],
});

module.exports = [
  ...expoConfig,
  prettier,
  {
    // assets/brand is a standalone Node dev-utility (regenerates the app's
    // icon/splash PNGs from SVG via `sharp`) — it's not app source, doesn't
    // ship, and doesn't belong to the RN/TypeScript ruleset below.
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'babel.config.js',
      'assets/brand/**',
    ],
  },
  {
    rules: {
      // The architecture relies on `void promise` at fire-and-forget call sites.
      'no-void': 'off',
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: forbid(
      [['@application/*', '@infrastructure/*', '@presentation/*', '@di/*', 'react', 'react-native', 'expo*']],
      'The domain must not depend on frameworks or outer layers.',
    ),
  },
  {
    files: ['src/application/**/*.ts'],
    rules: forbid(
      [['@infrastructure/*', '@presentation/*', '@di/*', 'react', 'react-native']],
      'Use cases talk to ports, never to adapters or the UI.',
    ),
  },
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: forbid(
      [['@presentation/*', '@di/*']],
      'Adapters are wired by the composition root, not the other way round.',
    ),
  },
];
