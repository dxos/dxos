module.exports = {
  "extends": [
    "../../../.eslintrc.js"
  ],
  "parserOptions": {
    "project": "tsconfig.json",
    "tsconfigRootDir": __dirname,
  },
  "ignorePatterns": [
    "demos/*",
    "src/functions/*",
    "tailwind.ts"
  ]
}
