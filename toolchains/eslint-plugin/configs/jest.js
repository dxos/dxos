const recomended = require('./recomended');

module.exports = {
  extends: [
    'plugin:jest/recommended',
  ],
  rules: {
    'jest/no-conditional-expect': 'off',
    'jest/valid-expect': 'off',
    'jest/no-standalone-expect': 'off'
  }
}
