//
// Copyright 2026 DXOS.org
//

// Scores the chat perf flow's `measure` rows — the blank space and the busy one together — against
// `src/playwright/perf/budgets.json`, or proposes work-counter budgets from several nights' rows.
//
//   node scripts/score-perf.ts score [--dir test-results/perf] [--counters] [--publish] [--summary <file>]
//   node scripts/score-perf.ts calibrate --run <dir> --run <dir> ... [--counters] [--write]
//
// `--counters` selects the counters-on pass (`DX_PERF_COUNTERS=trace,calls,react`): its costed work
// counters alone, against `budgets-counters.json`, as the `chat-work` suite. Its timings are
// inflated by the instruments and are never scored.
//
// `calibrate` reads one directory per run — a downloaded `chat-bench` (or `perf-counters`) artifact
// — and replaces the work-counter budgets with its proposal, leaving every other budget as it is.
//
// Run `score` once after every iteration has written its batch: a night's score is the median across
// them. A low score never fails the job; only broken inputs do.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  type Budget,
  COSTED_WORK_METRICS,
  calibrateStageRuns,
  parseBudgets,
  replaceWorkBudgets,
  scoreStageRun,
} from '@dxos/perf-harness/score';

import { BUSY_SCALE } from '../src/playwright/perf/suite.ts';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, '../../../..');
const BUDGETS_FILE = path.join(PACKAGE_ROOT, 'src/playwright/perf/budgets.json');
const COUNTERS_BUDGETS_FILE = path.join(PACKAGE_ROOT, 'src/playwright/perf/budgets-counters.json');

const FLOW = 'assistant-chat';
const SCALE = 'blank';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', default: path.join(WORKSPACE_ROOT, 'test-results', 'perf') },
    run: { type: 'string', multiple: true, default: [] },
    counters: { type: 'boolean', default: false },
    publish: { type: 'boolean', default: false },
    summary: { type: 'string' },
    write: { type: 'boolean', default: false },
  },
});

const [command] = positionals;
const budgetsFile = values.counters ? COUNTERS_BUDGETS_FILE : BUDGETS_FILE;
const work = values.counters ? [...COSTED_WORK_METRICS] : undefined;

const readBudgets = (): Record<string, Budget> => parseBudgets(JSON.parse(readFileSync(budgetsFile, 'utf8')));

if (command === 'score') {
  scoreStageRun({
    workspaceRoot: WORKSPACE_ROOT,
    dir: path.resolve(values.dir),
    flow: FLOW,
    scale: SCALE,
    extraScales: [BUSY_SCALE],
    ...(work ? { measure: { work, timings: false } } : {}),
    suite: values.counters ? 'chat-work' : 'chat',
    title: values.counters ? 'Chat work counters (counters-on pass)' : 'Chat performance',
    budgets: readBudgets(),
    budgetsFile: path.relative(PACKAGE_ROOT, budgetsFile),
    publish: values.publish,
    summary: values.summary,
  });
} else if (command === 'calibrate') {
  if (values.run.length < 2) {
    throw new Error('calibrate needs --run for at least two runs; one night cannot show a spread');
  }
  const proposed = calibrateStageRuns({
    dirs: values.run.map((dir) => path.resolve(dir)),
    flow: FLOW,
    scale: SCALE,
    extraScales: [BUSY_SCALE],
    ...(work ? { work } : {}),
  });
  if (values.write) {
    // An empty proposal means the runs carried none of the counters; writing it would drop every work budget.
    if (Object.keys(proposed).length === 0) {
      throw new Error('calibration proposed no work budgets; refusing to replace the existing ones');
    }
    const budgets = replaceWorkBudgets(readBudgets(), proposed, [BUSY_SCALE]);
    writeFileSync(budgetsFile, JSON.stringify(budgets, null, 2) + '\n');
    console.log(`wrote ${Object.keys(proposed).length} work budgets to ${path.relative(PACKAGE_ROOT, budgetsFile)}`);
  } else {
    console.log(JSON.stringify(proposed, null, 2));
  }
} else {
  throw new Error(`unknown command "${command ?? ''}"; expected score or calibrate`);
}
