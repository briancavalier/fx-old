module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  plugins: ['unused-imports'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  env: {
    node: true
  },
  rules: {
    'require-yield': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/naming-convention': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: false
        }
      }
    ],
    // Enable sort-imports to sort named imports within a single import
    // statement, but *disable* its declaration sort, and let
    // import/order's alphabetize feature handle sorting declarations
    // based on import path.
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true
      }
    ],
    'no-unused-vars': 'off',
    'unused-imports/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error'
  }
}
