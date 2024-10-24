//
// Copyright 2022 DXOS.org
//

module.exports = {
  rules: {
    comment: require('./rules/comment'),
    header: require('./rules/header'),
    'no-empty-promise-catch': require('./rules/no-empty-promise-catch'),
  },
};
