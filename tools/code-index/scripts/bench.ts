//
// Copyright 2026 DXOS.org
//

/**
 * Benchmarks the store on a real repository, through the CLI exactly as a user runs it:
 * a cold index into an empty store, a warm pass after touching one file, a pass with nothing changed,
 * then the store's size.
 * Prints a markdown table, or with `--json` the raw results instead.
 *
 *   bun scripts/bench.ts [--root <repo>] [--touch <repo-relative file>] [--json]
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
  readonly timings: {
    scanMs: number;
    parseMs: number;
    analyzeMs?: number;
    encodeMs?: number;
    commitMs: number;
    reasonMs: number;
    totalMs: number;
  };
  readonly reasoners: readonly { name: string; derived: number; durationMs: number; incremental?: boolean }[];
};

type Result = {
  readonly cold: Pass;
  readonly warm: Pass;
  readonly unchanged: Pass;
  readonly bytes: number;
  readonly quads: number;
};

const { values } = parseArgs({
  options: {
    root: { type: 'string' },
    touch: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

const root = values.root ?? (await run('git', ['rev-parse', '--show-toplevel'])).stdout.trim();
// The default file only exists in this repository; another root has to name its own.
if (values.root !== undefined && values.touch === undefined) {
  throw new Error('--touch <repo-relative file> is required with --root');
}
const touch = values.touch ?? 'tools/code-index/src/Store.ts';

const cli = async (args: string[]): Promise<string> =>
  (await run('bun', [CLI, ...args], { maxBuffer: 1 << 30 })).stdout;

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

const measure = async (): Promise<Result> => {
  const store = await mkdtemp(join(tmpdir(), 'code-index-bench-'));
  try {
    const index = async (): Promise<Pass> =>
      JSON.parse(await cli(['index', '--root', root, '--store', store, '--json']));
    const cold = await index();
    const touched = join(root, touch);
    const before = await stat(touched);
    await utimes(touched, before.atime, new Date());
    let warm: Pass;
    let unchanged: Pass;
    try {
      warm = await index();
      // Before the mtime is restored, which would itself be a change.
      unchanged = await index();
    } finally {
      await utimes(touched, before.atime, before.mtime);
    }
    const stats = JSON.parse(await cli(['stats', '--root', root, '--store', store, '--json']));
    return { cold, warm, unchanged, bytes: await size(store), quads: stats.quads };
  } finally {
    await rm(store, { recursive: true, force: true });
  }
};

const result = await measure();

const seconds = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const rows: [string, (result: Result) => string][] = [
  ['files indexed (cold)', (result) => String(result.cold.indexed)],
  ['quads', (result) => String(result.quads)],
  ['cold: total (wall)', (result) => seconds(result.cold.timings.totalMs)],
  ['cold: parse (summed over batches)', (result) => seconds(result.cold.timings.parseMs)],
  ['cold: of which analyze (in workers)', (result) => seconds(result.cold.timings.analyzeMs ?? 0)],
  ['cold: of which encode (in workers)', (result) => seconds(result.cold.timings.encodeMs ?? 0)],
  ['cold: commit (summed over batches)', (result) => seconds(result.cold.timings.commitMs)],
  ['cold: reason', (result) => seconds(result.cold.timings.reasonMs)],
  ['warm, one file: total', (result) => seconds(result.warm.timings.totalMs)],
  ['warm, one file: scan', (result) => seconds(result.warm.timings.scanMs)],
  ['warm, one file: parse', (result) => seconds(result.warm.timings.parseMs)],
  ['warm, one file: commit', (result) => seconds(result.warm.timings.commitMs)],
  ['warm, one file: reason', (result) => seconds(result.warm.timings.reasonMs)],
  [
    'warm reasoning incremental',
    (result) => String(result.warm.reasoners.every((outcome) => outcome.incremental === true)),
  ],
  ['no change: total', (result) => seconds(result.unchanged.timings.totalMs)],
  ['no change: derived reported', (result) => String(result.unchanged.derived)],
  ['derived quads', (result) => String(result.warm.derived)],
  ['store size', (result) => `${(result.bytes / 1e6).toFixed(0)} MB`],
];
if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('| | |');
  console.log('|---|---|');
  for (const [label, cell] of rows) {
    console.log(`| ${label} | ${cell(result)} |`);
  }
}
