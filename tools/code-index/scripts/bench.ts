//
// Copyright 2026 DXOS.org
//

/**
 * Benchmarks both store backends on a real repository, through the CLI exactly as a user runs it:
 * a cold index into an empty store, then a warm pass after touching one file, then the store's size.
 * Prints a markdown table (and `--json` the raw results).
 *
 *   bun scripts/bench.ts [--root <repo>] [--backends js,native] [--touch <repo-relative file>] [--json]
 *
 * The touched file's content is unchanged and its mtime is restored afterwards; the pass reindexes it
 * because the mtime is the incremental key. Run on an otherwise idle machine — `parse` is CPU-bound.
 */

import { execFile } from 'node:child_process';
import { mkdtemp, rm, stat, utimes } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const run = promisify(execFile);
const CLI = fileURLToPath(new URL('../bin/code-index.ts', import.meta.url));

type Pass = {
  readonly indexed: number;
  readonly derived: number;
  readonly timings: { scanMs: number; parseMs: number; commitMs: number; reasonMs: number; totalMs: number };
  readonly reasoners: readonly { name: string; derived: number; durationMs: number; incremental?: boolean }[];
};

type Result = {
  readonly backend: string;
  readonly cold: Pass;
  readonly warm: Pass;
  readonly bytes: number;
  readonly quads: number;
};

const { values } = parseArgs({
  options: {
    root: { type: 'string' },
    backends: { type: 'string', default: 'js,native' },
    touch: { type: 'string', default: 'tools/code-index/src/Store.ts' },
    json: { type: 'boolean', default: false },
  },
});

const root = values.root ?? (await run('git', ['rev-parse', '--show-toplevel'])).stdout.trim();

const cli = async (backend: string, args: string[]): Promise<string> =>
  (
    await run('bun', [CLI, ...args], {
      env: { ...process.env, CODE_INDEX_BACKEND: backend },
      maxBuffer: 1 << 30,
    })
  ).stdout;

const size = async (path: string): Promise<number> => {
  const info = await stat(path);
  if (!info.isDirectory()) {
    return info.size;
  }
  let total = 0;
  for (const entry of await readdir(path)) {
    total += await size(join(path, entry));
  }
  return total;
};

const results: Result[] = [];
for (const backend of values.backends.split(',')) {
  const store = await mkdtemp(join(tmpdir(), `code-index-bench-${backend}-`));
  try {
    const index = async (): Promise<Pass> =>
      JSON.parse(await cli(backend, ['index', '--root', root, '--store', store, '--json']));
    const cold = await index();
    const touched = join(root, values.touch);
    const before = await stat(touched);
    await utimes(touched, before.atime, new Date());
    let warm: Pass;
    try {
      warm = await index();
    } finally {
      await utimes(touched, before.atime, before.mtime);
    }
    const stats = JSON.parse(await cli(backend, ['stats', '--root', root, '--store', store, '--json']));
    results.push({ backend, cold, warm, bytes: await size(store), quads: stats.quads });
  } finally {
    await rm(store, { recursive: true, force: true });
  }
}

const seconds = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const rows: [string, (result: Result) => string][] = [
  ['files indexed (cold)', (result) => String(result.cold.indexed)],
  ['quads', (result) => String(result.quads)],
  ['cold: total (wall)', (result) => seconds(result.cold.timings.totalMs)],
  ['cold: commit (summed over batches)', (result) => seconds(result.cold.timings.commitMs)],
  ['cold: reason', (result) => seconds(result.cold.timings.reasonMs)],
  ['warm, one file: total', (result) => seconds(result.warm.timings.totalMs)],
  ['warm, one file: commit', (result) => seconds(result.warm.timings.commitMs)],
  ['warm, one file: reason', (result) => seconds(result.warm.timings.reasonMs)],
  [
    'warm reasoning incremental',
    (result) => String(result.warm.reasoners.every((outcome) => outcome.incremental === true)),
  ],
  ['derived quads', (result) => String(result.warm.derived)],
  ['store size', (result) => `${(result.bytes / 1e6).toFixed(0)} MB`],
];
console.log(`| | ${results.map((result) => result.backend).join(' | ')} |`);
console.log(`|---|${results.map(() => '---').join('|')}|`);
for (const [label, cell] of rows) {
  console.log(`| ${label} | ${results.map(cell).join(' | ')} |`);
}
if (values.json) {
  console.log(JSON.stringify(results, null, 2));
}
