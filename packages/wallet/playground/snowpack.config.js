//
// Copyright 2020 DXOS.org
//

// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import('snowpack').SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/dist'
  },
  plugins: [
    '@snowpack/plugin-typescript'
  ],
  packageOptions: {
    installTypes: true,
    polyfillNode: true,
    rollup: {
      plugins: [
        require('rollup-plugin-node-globals')()
      ]
    }
  },
  devOptions: {
  },
  buildOptions: {
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018'
  }
};
