//
// Copyright 2026 DXOS.org
//

// Scores the chat perf flow's `measure` rows — the blank space and the busy one together — against
// `src/playwright/perf/budgets.json`.
//
//   node scripts/score-perf.ts score [--dir test-results/perf] [--publish] [--summary <file>]
//
// Run once after every iteration has written its batch: a night's score is the median across them.
// A low score never fails the job; only broken inputs do.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { parseBudgets, scoreStageRun } from '@dxos/perf-harness/score';

import { BUSY_SCALE } from '../src/playwright/perf/suite.ts';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, '../../../..');
const BUDGETS_FILE = path.join(PACKAGE_ROOT, 'src/playwright/perf/budgets.json');

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', default: path.join(WORKSPACE_ROOT, 'test-results', 'perf') },
    publish: { type: 'boolean', default: false },
    summary: { type: 'string' },
  },
});

const [command] = positionals;

if (command === 'score') {
  scoreStageRun({
    workspaceRoot: WORKSPACE_ROOT,
    dir: path.resolve(values.dir),
    flow: 'assistant-chat',
    scale: 'blank',
    extraScales: [BUSY_SCALE],
    suite: 'chat',
    title: 'Chat performance',
    budgets: parseBudgets(JSON.parse(readFileSync(BUDGETS_FILE, 'utf8'))),
    budgetsFile: 'src/playwright/perf/budgets.json',
    publish: values.publish,
    summary: values.summary,
  });
} else {
  throw new Error(`unknown command "${command ?? ''}"; expected score`);
}
