const path = require('path')

/**
 * @returns {import('esbuild').Plugin}
 */
function NodeGlobalsPolyfillPlugin() {
    return {
        name: 'node-globals-polyfill',
        setup({ initialOptions }) {
            const polyfills = [
                path.resolve(__dirname, './polyfills/process.js'),
                path.resolve(__dirname, './polyfills/Buffer.js')
            ]
            if (initialOptions.inject) {
                initialOptions.inject.push(...polyfills)
            } else {
                initialOptions.inject = [...polyfills]
            }
        },
    }
}

/**
 * @returns {import('esbuild').Plugin}
 */
 function FixMemdownPlugin() {
    return {
      name: 'fix-memdown-plugin',
      setup({ onResolve }) {
        onResolve({ filter: /^immediate$/ }, arg => {
          return {
            path: require.resolve(arg.path, { paths: [arg.resolveDir] })
          }
        })
      }
    }
  }
  

module.exports = {
    NodeGlobalsPolyfillPlugin,
    FixMemdownPlugin
}

