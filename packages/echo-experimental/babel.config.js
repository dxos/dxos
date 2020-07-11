//
// Copyright 2020 DXOS.org
//

module.exports = {
  env: {
    development: {
      sourceMaps: 'inline',
      plugins: ['source-map-support']
    }
  },
  presets: [
    [
      '@babel/preset-env'
    ]
  ],
  plugins: [
    'add-module-exports',
    [
      'babel-plugin-inline-import', {
        extensions: [
          '.proto',
          '.txt'
        ]
      }
    ],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from'
  ]
};
