const baseConfig = require('../../.eslintrc.json')

module.exports = {
  ...baseConfig,
  ignorePatterns: ['/src/proto/gen/*'],
}
