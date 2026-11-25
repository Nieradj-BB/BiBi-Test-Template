import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// The forbidden libraries from CLAUDE.md: use native ES2023+ or date-fns.
const FORBIDDEN_LIBRARIES = [
  'moment',
  'lodash',
  'jquery',
  'async',
  'underscore',
  'request',
  'bluebird',
  'q',
  'requirejs',
  'backbone',
].map((name) => ({
  name,
  message: 'Verboden library (CLAUDE.md): gebruik native ES2023+ of date-fns.',
}));

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          paths: FORBIDDEN_LIBRARIES,
          patterns: [
            {
              group: ['lodash/*', 'lodash.*'],
              message: 'Verboden library (CLAUDE.md): gebruik native ES2023+.',
            },
          ],
        },
      ],
    },
  },
);
