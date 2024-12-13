module.exports = {
  extends: ['../../../../.eslintrc.js'],
  ignorePatterns: ['templates/**'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
