// Simulates the edge operation-service bundler (packages/core/compute/edge-compute/src/native/bundler.ts):
// esbuild, conditions ['workerd','worker','browser'], node:* external — bundling the collapsed
// plugin-markdown entry and asserting React never enters the bundle.
import { createRequire } from 'node:module';

const require = createRequire('/home/user/dxos/packages/experimental/env-tests/package.json');
const { build } = require('esbuild');

const result = await build({
  entryPoints: ['test:entry'],
  bundle: true,
  write: false,
  metafile: true,
  conditions: ['workerd', 'worker', 'browser'],
  external: ['*.wasm', 'node:*'],
  plugins: [
    {
      name: 'test-plugin',
      setup: (build) => {
        build.onResolve({ filter: /^test:entry$/ }, (args) => ({ path: args.path, namespace: 'test-plugin' }));
        build.onLoad({ filter: /^test:entry$/, namespace: 'test-plugin' }, () => ({
          loader: 'ts',
          contents: `export * as plugin from '@dxos/plugin-markdown/MarkdownPlugin';`,
          resolveDir: '/home/user/dxos/packages/plugins/plugin-assistant/src',
        }));
      },
    },
  ],
});

// Matches the repo's check-module-structure policy (react/react-dom/@dxos/react-ui). Codemirror
// reaches the workerd bundle through OperationHandler -> operations -> @dxos/ui-editor/headless on
// main as well — pre-existing, not introduced by the single-entry collapse.
const forbid = [/\/react\//, /\/react-dom\//, /@dxos\+react-ui\b/, /\/ui\/react-ui\/dist/];
const problems = [];
const inputs = new Set();
for (const output of Object.values(result.metafile.outputs)) {
  for (const [input, meta] of Object.entries(output.inputs)) {
    if (meta.bytesInOutput > 0) {
      inputs.add(input);
      if (forbid.some((p) => p.test(input))) problems.push(input);
    }
  }
}
console.log(`bundled inputs: ${inputs.size}`);
const markdownInputs = [...inputs].filter((i) => i.includes('plugin-markdown'));
console.log('plugin-markdown inputs in bundle:');
for (const i of markdownInputs.sort()) console.log('  ' + i);
if (problems.length) {
  console.error('FORBIDDEN INPUTS FOUND:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('OK: no react/react-dom/react-ui/codemirror inputs in workerd-condition bundle');
