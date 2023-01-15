import { Frame } from "./proto/gen/schema";
import { initialize, build } from 'esbuild-wasm'
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url'
import { sha256 } from '@dxos/crypto'

let initializePromise

export async function compile(frame: Frame) {
  await (initializePromise ??= initialize({
    wasmURL: esbuildWasmURL,
  }))

  const source = frame.content.doc!.getText('monaco').toString();

  const output = await build({
    entryPoints: ['echofs:main.tsx'],
    outdir: 'dist',
    platform: 'browser',
    format: 'esm',
    plugins: [
      {
        name: 'echofs',
        setup(build) {
          build.onResolve({ filter: /^echofs:/ }, args => {
            return { path: args.path.slice(7), namespace: 'echofs' }
          })
          build.onLoad({ filter: /.*/, namespace: 'echofs' }, async args => {
            if (args.path === 'main.tsx') {
              return {
                contents: source,
                loader: 'tsx'
              }
            }
          })
        }
      }
    ]
  })

  frame.compiled = {
    sourceHash: Buffer.from(sha256(source), 'hex'),
    bundle: output.outputFiles![0].text
  }
}