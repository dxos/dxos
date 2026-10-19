#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Measures the bundled size of @dxos/sparql-sqlite as a Worker or Vite app would ship it:
// esbuild, minified, ESM, browser platform, tree-shaken, every dependency inlined.
//
//   node scripts/size.mjs [--entry src/index.ts] [--top 20] [--json out.json] [--max-gzip BYTES]
//
// `--max-gzip` exits non-zero when the gzip size exceeds the budget (used by `moon run sparql-sqlite:size`).

import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  options: {
    'entry': { type: 'string', default: 'src/index.ts' },
    'top': { type: 'string', default: '20' },
    'json': { type: 'string' },
    'max-gzip': { type: 'string' },
  },
});

const gzip = (bytes) => gzipSync(bytes, { level: 9 }).length;
const brotli = (bytes) => brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

/** Names a metafile input by package and file (`sparqljs/lib/SparqlParser.js`) or by repo path. */
const nameOf = (input) => {
  const match = input.match(/.*node_modules\/((?:@[^/]+\/)?[^/]+)\/(.*)$/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  const workspace = input.match(/^(?:\.\.\/)+(.*)$/);
  return workspace ? workspace[1] : input;
};

const outdir = mkdtempSync(join(tmpdir(), 'sparql-sqlite-size-'));
try {
  const result = await build({
    absWorkingDir: packageDir,
    entryPoints: [args.entry],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    treeShaking: true,
    splitting: true,
    // Workspace packages are bundled from source so the measurement needs no prior build.
    conditions: ['source'],
    outdir,
    metafile: true,
    write: false,
    logLevel: 'warning',
  });

  const chunks = result.outputFiles
    .filter((file) => file.path.endsWith('.js'))
    .map((file) => ({
      path: relative(outdir, file.path),
      raw: file.contents.length,
      gzip: gzip(file.contents),
      brotli: brotli(file.contents),
    }));
  const entryChunk = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint)?.[0];
  const entryName = entryChunk ? relative(outdir, resolve(packageDir, entryChunk)) : undefined;

  // Bytes each input contributes to the minified output, summed over chunks.
  const byGroup = new Map();
  const byFile = new Map();
  for (const output of Object.values(result.metafile.outputs)) {
    for (const [input, { bytesInOutput }] of Object.entries(output.inputs)) {
      byFile.set(input, (byFile.get(input) ?? 0) + bytesInOutput);
      const group = nameOf(input);
      byGroup.set(group, (byGroup.get(group) ?? 0) + bytesInOutput);
    }
  }
  const total = [...byFile.values()].reduce((sum, bytes) => sum + bytes, 0);
  const sorted = (map) => [...map.entries()].sort((left, right) => right[1] - left[1]);
  const percent = (bytes) => `${((100 * bytes) / total).toFixed(1).padStart(5)}%`;
  const kb = (bytes) => `${(bytes / 1024).toFixed(1).padStart(7)} KB`;

  const sum = (key) => chunks.reduce((acc, chunk) => acc + chunk[key], 0);
  const initial = chunks.find((chunk) => chunk.path === entryName) ?? chunks[0];
  console.log(`entry: ${args.entry} (esbuild: minify, esm, browser, tree-shaken)`);
  console.log('');
  console.log('chunk                                   raw        gzip      brotli');
  for (const chunk of chunks) {
    console.log(
      `${(chunk.path === entryName ? `${chunk.path} (entry)` : chunk.path).padEnd(32)}${kb(chunk.raw)} ${kb(chunk.gzip)} ${kb(chunk.brotli)}`,
    );
  }
  if (chunks.length > 1) {
    console.log(`${'all chunks'.padEnd(32)}${kb(sum('raw'))} ${kb(sum('gzip'))} ${kb(sum('brotli'))}`);
  }
  console.log('');
  console.log('by package / module (minified bytes before compression)');
  for (const [group, bytes] of sorted(byGroup).slice(0, Number(args.top))) {
    console.log(`  ${kb(bytes)} ${percent(bytes)}  ${group}`);
  }

  const report = {
    entry: args.entry,
    initial,
    chunks,
    total: { raw: sum('raw'), gzip: sum('gzip'), brotli: sum('brotli') },
    groups: Object.fromEntries(sorted(byGroup)),
  };
  if (args.json) {
    writeFileSync(args.json, `${JSON.stringify(report, null, 2)}\n`);
  }
  const budget = args['max-gzip'] ? Number(args['max-gzip']) : undefined;
  if (budget !== undefined && initial.gzip > budget) {
    console.error(`\nentry chunk gzip ${initial.gzip} B exceeds the budget of ${budget} B`);
    process.exitCode = 1;
  }
} finally {
  rmSync(outdir, { recursive: true, force: true });
}
