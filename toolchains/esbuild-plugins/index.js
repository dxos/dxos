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

/**
* @returns {import('esbuild').Plugin}
*/
function FixGracefulFsPlugin() {
  return {
    name: 'fix-graceful-fs-plugin',
    setup({ onResolve, onLoad }) {
      onResolve({ filter: /^graceful-fs$/ }, arg => {
        return {
          path: 'graceful-fs',
          namespace: 'fix-graceful-fs-plugin'
        }
      })

      onLoad({ filter: /^graceful-fs$/,  namespace: 'fix-graceful-fs-plugin' }, async (args) => {
        return {
          contents: `module.exports = {};`,
          loader: 'js',
        }
      })
    }
  }
}

/**
* @returns {import('esbuild').Plugin}
*/
function NodeModulesPlugin() {
  return {
    name: 'node-modules-plugin',
    setup({ onResolve }) {
      onResolve({ filter: /^assert$/ }, arg => {
        return {
          path: require.resolve('assert/'), // Appending slash makes node resolve the installed package from node_modules.
        }
      })
      onResolve({ filter: /^stream$/ }, arg => {
        return {
          path: require.resolve('readable-stream'),
        }
      })
      onResolve({ filter: /^path$/ }, arg => {
        return {
          path: require.resolve('path-browserify'),
        }
      })
      onResolve({ filter: /^events$/ }, arg => {
        return {
          path: require.resolve('events/'),
        }
      })
      onResolve({ filter: /^util$/ }, arg => {
        return {
          path: require.resolve('util/'),
        }
      })
      onResolve({ filter: /^http$/ }, arg => {
        return {
          path: require.resolve('./polyfills/empty-module-stub.js'),
        }
      })
      onResolve({ filter: /^https$/ }, arg => {
        return {
          path: require.resolve('./polyfills/empty-module-stub.js'),
        }
      })
      onResolve({ filter: /^module$/ }, arg => {
        return {
          path: require.resolve('./polyfills/module.js'),
        }
      })
      onResolve({ filter: /^crypto$/ }, arg => { // TODO
        return {
          path: require.resolve('./polyfills/empty-module-stub.js'),
        }
      })
    }
  }
}

module.exports = {
  NodeGlobalsPolyfillPlugin,
  FixGracefulFsPlugin,
  FixMemdownPlugin,
  NodeModulesPlugin
}

