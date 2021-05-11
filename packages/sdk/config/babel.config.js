//
// Copyright 2020 DXOS.
//

module.exports = {
  presets: [
    '@babel/preset-env'
  ],
  plugins: [
    [
      'babel-plugin-inline-import', {
        'extensions': [
          '.yml'
        ]
      }
    ],
    'add-module-exports',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-transform-runtime'
  ]
};
