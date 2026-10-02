//
// Copyright 2026 DXOS.org
//

// Scores the chat perf flow's `measure` rows of one fixture against that fixture's budgets.
//
//   node scripts/score-perf.ts score [--scale blank|busy] [--dir test-results/perf] [--publish] [--summary <file>]
//
// Run once after every iteration has written its batch: a night's score is the median across them.
// A low score never fails the job; only broken inputs do.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { parseBudgets, scoreStageRun } from '@dxos/perf-harness/score';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, '../../../..');

/**
 * Each fixture is scored on its own suite and budgets: the busy space's stages are slower by design,
 * so one set of budgets would either flag every busy night or never flag a blank one.
 */
const SUITES = {
  blank: { suite: 'chat', title: 'Chat performance', budgetsFile: 'src/playwright/perf/budgets.json' },
  busy: {
    suite: 'chat-busy',
    title: 'Chat performance (busy space)',
    budgetsFile: 'src/playwright/perf/budgets-busy.json',
  },
} as const;

const isScale = (value: string): value is keyof typeof SUITES => Object.hasOwn(SUITES, value);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    scale: { type: 'string', default: 'blank' },
    dir: { type: 'string', default: path.join(WORKSPACE_ROOT, 'test-results', 'perf') },
    publish: { type: 'boolean', default: false },
    summary: { type: 'string' },
  },
});

const [command] = positionals;

if (command === 'score') {
  const { scale } = values;
  if (!isScale(scale)) {
    throw new Error(`unknown scale "${scale}"; expected ${Object.keys(SUITES).join(' or ')}`);
  }
  const { suite, title, budgetsFile } = SUITES[scale];
  scoreStageRun({
    workspaceRoot: WORKSPACE_ROOT,
    dir: path.resolve(values.dir),
    flow: 'assistant-chat',
    scale,
    suite,
    title,
    budgets: parseBudgets(JSON.parse(readFileSync(path.join(PACKAGE_ROOT, budgetsFile), 'utf8'))),
    budgetsFile,
    publish: values.publish,
    summary: values.summary,
  });
} else {
  throw new Error(`unknown command "${command ?? ''}"; expected score`);
}
