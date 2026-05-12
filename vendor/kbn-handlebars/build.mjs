//
// Copyright 2026 DXOS.org
//

// Custom esbuild bundle for `@dxos/vendor-kbn-handlebars`.
//
// Stubs the dead `Handlebars.compile()` JS-codegen path so the bundled output only
// contains the AST-walking `compileAST()` path that we actually use. Cuts roughly
// 100 KiB out of the bundle (handlebars's `javascript-compiler` + `code-gen` and the
// transitively unreachable `source-map` library) and removes the static `new Function()`
// reference in `code-gen.js`.

import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';

const outDir = 'dist/lib/neutral';
const outFile = `${outDir}/index.mjs`;

// `compiler.js` defines `Handlebars.compile` / `precompile`; `javascript-compiler.js`
// defines `Handlebars.JavaScriptCompiler`. Both are exposed on the Handlebars object as
// statics by `dist/cjs/handlebars.js`, but kbn-handlebars never invokes them — it walks
// the AST through `Handlebars.parse` + `Handlebars.Visitor`. We replace both modules
// with empty CJS shims so esbuild can prune them and their unreachable transitives.
const STUB_FILTER = /handlebars\/dist\/cjs\/handlebars\/compiler\/(compiler|javascript-compiler)\.js$/;
const STUB_CONTENTS = [
  "'use strict';",
  'exports.__esModule = true;',
  'function noop() {}',
  "exports['default'] = noop;",
  'exports.Compiler = noop;',
  'exports.compile = noop;',
  'exports.precompile = noop;',
  '',
].join('\n');

await rm('dist', { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: ['src/index.js'],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['browser', 'module', 'main'],
  sourcemap: true,
  metafile: true,
  legalComments: 'none',
  plugins: [
    {
      name: 'stub-handlebars-codegen',
      setup(b) {
        b.onLoad({ filter: STUB_FILTER }, () => ({ contents: STUB_CONTENTS, loader: 'js' }));
      },
    },
  ],
});

await writeFile(`${outDir}/meta.json`, JSON.stringify(result.metafile));

const bytes = result.metafile.outputs[outFile].bytes;
console.log(`Bundled ${outFile} (${(bytes / 1024).toFixed(1)} KiB)`);
