module.exports = {
  rules: {
    comment: require('./rules/comment'),
    header: require('./rules/header'),
  },
  configs: {
    jest: require('./configs/jest'),
    recomended: require('./configs/recomended'),
    react: require('./configs/react'),
  }
}
