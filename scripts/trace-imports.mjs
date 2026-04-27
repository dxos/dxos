// Trace which packages a hypothetical CF Worker entrypoint would pull in
// when importing AgentHandlers / AgentBlueprintHandlers / DatabaseHandlers
// from @dxos/assistant-toolkit (matches edge/system-operations/src/operations.ts).

import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Synthesize an entry file mirroring edge/system-operations/src/operations.ts.
// Place inside assistant-toolkit so pnpm per-package node_modules resolves correctly.
const tmpDir = `${repoRoot}/packages/core/assistant-toolkit/.trace-imports`;
mkdirSync(tmpDir, { recursive: true });
const entry = `${tmpDir}/entry.ts`;
writeFileSync(
  entry,
  `import { AgentHandlers, AgentBlueprintHandlers, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { OperationHandlerSet } from '@dxos/operation';

export const SYSTEM_OPERATION_HANDLER_SET = OperationHandlerSet.merge(
  AgentHandlers,
  AgentBlueprintHandlers,
  DatabaseHandlers,
);
`,
);

// Mirror trace plugin from edge repo: keep @dxos/* internal, mark everything else external.
const externalNonWorkspace = {
  name: 'external-non-workspace',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (
        args.path === 'cloudflare:workers' ||
        args.path.startsWith('cloudflare:') ||
        args.path.startsWith('node:')
      ) {
        return { path: args.path, external: true };
      }
      if (args.path.startsWith('@dxos/')) return null;
      return { path: args.path, external: true };
    });
  },
};

const stripRawSuffix = {
  name: 'strip-raw-suffix',
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (args) =>
      b.resolve(args.path.replace(/\?raw$/, ''), {
        kind: args.kind,
        resolveDir: args.resolveDir,
        importer: args.importer,
      }),
    );
  },
};

const result = await build({
  absWorkingDir: repoRoot,
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  conditions: ['source', 'workerd', 'worker', 'browser'],
  mainFields: ['module', 'main'],
  metafile: true,
  write: false,
  outfile: '/dev/null',
  logLevel: 'error',
  loader: {
    '.wasm': 'empty',
    '.pcss': 'empty',
    '.css': 'empty',
    '.tpl': 'text',
    '.svg': 'empty',
    '.png': 'empty',
  },
  plugins: [externalNonWorkspace, stripRawSuffix],
});

writeFileSync('/tmp/dxos-trace/meta.json', JSON.stringify(result.metafile, null, 2));

const meta = result.metafile;
const pkgs = new Set();
for (const [, info] of Object.entries(meta.inputs)) {
  for (const imp of info.imports) {
    if (!imp.external) continue;
    const name = imp.path.startsWith('@')
      ? imp.path.split('/').slice(0, 2).join('/')
      : imp.path.split('/')[0];
    pkgs.add(name);
  }
}

const isNoise = (name) =>
  name === '<runtime>' || name === '.' || name === '..' || name.startsWith('#');

const node = [...pkgs].filter((p) => p.startsWith('node:') || p === 'cloudflare:workers').sort();
const dxos = [...pkgs].filter((p) => p.startsWith('@dxos/')).sort();
const radix = [...pkgs].filter((p) => p.startsWith('@radix-ui/')).sort();
const otel = [...pkgs].filter((p) => p.startsWith('@opentelemetry/')).sort();
const internalSubpath = [...pkgs].filter((p) => p.startsWith('#')).sort();
const other = [...pkgs]
  .filter(
    (p) =>
      !isNoise(p) &&
      !p.startsWith('node:') &&
      p !== 'cloudflare:workers' &&
      !p.startsWith('@dxos/') &&
      !p.startsWith('@radix-ui/') &&
      !p.startsWith('@opentelemetry/'),
  )
  .sort();

console.log(`Inputs walked: ${Object.keys(meta.inputs).length}`);
console.log(`Distinct external packages: ${pkgs.size}\n`);

const print = (title, list) => {
  if (!list.length) return;
  console.log(`=== ${title} (${list.length}) ===`);
  for (const pkg of list) console.log(`  ${pkg}`);
  console.log();
};

print('Runtime / built-ins', node);
print('@dxos/* (workspace)', dxos);
print('@opentelemetry/*', otel);
print('@radix-ui/*', radix);
print('Other third-party', other);
if (internalSubpath.length) print('Package #subpath imports', internalSubpath);

const uiSignals = [
  'react',
  '@radix-ui/react-dialog',
  '@dxos/react-ui',
  '@dxos/lit-ui',
  '@codemirror/state',
  '@dxos/app-toolkit',
];
const stillLeaks = uiSignals.filter((p) => pkgs.has(p));
console.log('UI leak signals:');
for (const sig of uiSignals) {
  console.log(`  ${pkgs.has(sig) ? '✗ STILL LEAKS:' : '✓ ok          :'} ${sig}`);
}
process.exit(stillLeaks.length ? 1 : 0);
