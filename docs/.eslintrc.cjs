module.exports = {
  "extends": [
    "../.eslintrc.js"
  ],
  "parserOptions": {
    "project": "tsconfig.json",
    "tsconfigRootDir": __dirname,
  },
  "ignorePatterns": [
    "legacy/**/*",
    "public/**/*",
    "src/content/**/*"
  ]
}
