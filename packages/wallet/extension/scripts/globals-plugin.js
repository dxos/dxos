const path = require('path')
const fs = require('fs')
const esbuild = require('esbuild')

function NodeGlobalsPolyfillPlugin() {
    return {
        name: 'node-globals-polyfill',
        setup({ initialOptions, onResolve, onLoad }) {
            onResolve({ filter: /_node-buffer-polyfill_\.js/ }, (arg) => {
                return {
                    path: path.resolve(__dirname, './Buffer.js'),
                }
            })
            onResolve({ filter: /_node-process-polyfill_\.js/ }, (arg) => {
                return {
                    path: path.resolve(__dirname, './process.js'),
                }
            })

            onLoad({ filter: /_virtual-process-polyfill_\.js/ }, (arg) => {
                const data = fs
                    .readFileSync(path.resolve(__dirname, './process.js'))
                    .toString()

                return {
                    loader: 'js',
                    contents: data,
                }
            })

            const polyfills = [
                path.resolve(__dirname, './_virtual-process-polyfill_.js'),
                path.resolve(__dirname, './_Buffer.js')
            ]
            if (initialOptions.inject) {
                initialOptions.inject.push(...polyfills)
            } else {
                initialOptions.inject = [...polyfills]
            }
        },
    }
}

module.exports = NodeGlobalsPolyfillPlugin
