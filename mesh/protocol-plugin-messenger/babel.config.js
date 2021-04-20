//
// Copyright 2019 DxOS.
//

module.exports = {
  presets: [
    [
      '@babel/preset-env'
    ]
  ],
  plugins: [
    [
      'babel-plugin-inline-import', {
        extensions: [
          '.proto',
          '.txt',
          '.json'
        ]
      }
    ],
    'add-module-exports',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from'
  ]
};
