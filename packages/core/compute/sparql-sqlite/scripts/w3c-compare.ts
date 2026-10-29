//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  type W3cEngine,
  type W3cOutcome,
  type W3cTest,
  loadW3cTests,
  runW3cTest,
  sqlEngine,
} from '../src/testing/w3c/index.ts';
import { createComunicaEngine, createOxigraphEngine } from './engines.ts';

/**
 * Runs the vendored W3C query suites against sparql-sqlite, Oxigraph and Comunica with the same
 * harness and prints per-category pass counts as a Markdown table.
 *
 *   pnpm exec tsx scripts/w3c-compare.ts [--out .cache/w3c-compare.json]
 */

const TIMEOUT_MS = 10_000;

const withTimeout = async (promise: Promise<W3cOutcome>): Promise<W3cOutcome> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<W3cOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ status: 'error', message: 'timeout' }), TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const run = async (engine: W3cEngine, test: W3cTest): Promise<W3cOutcome> => {
  try {
    return await withTimeout(runW3cTest(engine, test));
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
};

const main = async () => {
  const outIndex = process.argv.indexOf('--out');
  const out =
    outIndex > 0 ? process.argv[outIndex + 1] : fileURLToPath(new URL('../.cache/w3c-compare.json', import.meta.url));
  const engines = [sqlEngine, createOxigraphEngine(), createComunicaEngine()];
  const tests = loadW3cTests();
  const results: Record<string, Record<string, W3cOutcome>> = {};
  for (const test of tests) {
    results[test.id] = {};
    for (const engine of engines) {
      results[test.id][engine.name] = await run(engine, test);
    }
  }

  type Counts = { total: number; skipped: number; passed: Map<string, number> };
  const rows = new Map<string, Counts>();
  const count = (key: string, test: W3cTest) => {
    const counts = rows.get(key) ?? { total: 0, skipped: 0, passed: new Map<string, number>() };
    rows.set(key, counts);
    if (test.skip) {
      counts.skipped++;
      return;
    }
    counts.total++;
    for (const engine of engines) {
      if (results[test.id][engine.name].status === 'pass') {
        counts.passed.set(engine.name, (counts.passed.get(engine.name) ?? 0) + 1);
      }
    }
  };
  for (const test of tests) {
    count(test.type === 'eval' ? test.category : `${test.category} (syntax)`, test);
    count(test.type === 'eval' ? 'TOTAL evaluation' : 'TOTAL syntax', test);
  }

  const header = `| category | tests | ${engines.map((engine) => engine.name).join(' | ')} |`;
  console.log(header);
  console.log(`| --- | ---: | ${engines.map(() => '---:').join(' | ')} |`);
  const keys = [...rows.keys()].sort((left, right) =>
    left.startsWith('TOTAL') === right.startsWith('TOTAL')
      ? left.localeCompare(right)
      : left.startsWith('TOTAL')
        ? 1
        : -1,
  );
  for (const key of keys) {
    const counts = rows.get(key);
    if (!counts) {
      continue;
    }
    const cells = engines.map((engine) => {
      const passed = counts.passed.get(engine.name) ?? 0;
      return counts.total ? `${passed} (${Math.round((100 * passed) / counts.total)}%)` : '-';
    });
    console.log(`| ${key} | ${counts.total} | ${cells.join(' | ')} |`);
  }

  mkdirSync(fileURLToPath(new URL('../.cache/', import.meta.url)), { recursive: true });
  writeFileSync(out, JSON.stringify(results, null, 1));
  console.error(`details: ${out}`);
};

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
