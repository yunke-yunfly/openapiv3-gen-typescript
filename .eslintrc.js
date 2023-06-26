module.exports = {
  extends: [require.resolve('@umijs/fabric/dist/eslint')],
  rules: {
    indent: 'off',
    '@typescript-eslint/type-annotation-spacing': 0,
  },
  ignorePatterns: ['src/__tests__/**', 'rollup.config.js', 'commitlint.config.js'],
};
