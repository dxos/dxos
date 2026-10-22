#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Decides which test and e2e cells a Check run starts, so a change that touches none of a suite's
// targets starts none of its runners. Reads the affected scope the `affected` action exported: with
// MOON_BASE unset it is a full run and every cell starts. `--downstream deep` counts a task as affected
// when anything it depends on changed. A change to CI, toolchain or root config is an input of no task
// yet changes how every test runs, so it starts every cell too, as does any failure: skipping a suite
// that should have run is the one outcome this must never produce. A draft PR starts only the node
// cells. The merge queue starts no e2e cells, since e2e cannot block a merge, and a push to main starts
// only the e2e cells.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const NODE_TASKS = new Set(['test', 'test-memory', 'test-workerd']);
const BROWSER_TASKS = new Set(['test-browser', 'test-storybook']);
// CI workflows and actions, moon and toolchain config, patches, and root files other than docs.
const CONFIG_PATH = /^(?:\.github|\.moon|patches)\/|^[^/]+$/;

// Playwright shards per browser for composer e2e, sized for a 4 vCPU / 16 GB runner. One WebKit page
// holds ~6 GB and two-peer specs open two, so WebKit runs a single worker on twice the shards.
const COMPOSER_SHARDS = {
  chromium: { shards: 2, workers: 2 },
  firefox: { shards: 2, workers: 2 },
  webkit: { shards: 4, workers: 1 },
};

// Target-list halves per browser for the rest of the e2e pool, one Playwright worker each.
const REST_SHARDS = 2;

// Most cells the browser and storybook targets are split across, by count.
const BROWSER_SHARDS = 8;

const main = () => {
  const draft = process.env.DRAFT === 'true';
  const tests = process.env.MAIN_PUSH !== 'true';
  const e2e = process.env.MERGE_QUEUE !== 'true';
  const browsers = draft ? [] : ['chromium', 'firefox', 'webkit'];
  const affected = readAffected();
  const browserTargets =
    draft || !tests ? [] : (affected ?? queryTasks([])).filter(([, task]) => BROWSER_TASKS.has(task));
  const plan = {
    browsers,
    node: tests && (affected?.some(([, task]) => NODE_TASKS.has(task)) ?? true),
    browser: browserTargets.length > 0,
    composer: e2e && (affected?.some(([project, task]) => project === 'composer-e2e' && task === 'e2e') ?? true),
    rest: e2e && (affected?.some(([project, task]) => project !== 'composer-e2e' && task === 'e2e') ?? true),
  };
  const outputs = {
    node: String(plan.node),
    browser: String(plan.browser),
    ...cellOutputs('browser', browserCells(browserTargets)),
    ...cellOutputs('composer', plan.composer ? composerCells(browsers) : []),
    ...cellOutputs('rest', plan.rest ? restCells(browsers) : []),
  };
  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`);
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
};

// A matrix over the labels alone: GitHub names a cell `<job name> (<label>)`, and shows a skipped matrix
// job's name unevaluated, so a name built from matrix fields reads as raw `${{ matrix.* }}` there. Each
// job looks its cell's fields up in `<suite>-config` by label.
const cellOutputs = (suite, cells) => ({
  [`${suite}-cells`]: JSON.stringify(cells.map(({ cell }) => cell)),
  [`${suite}-config`]: JSON.stringify(Object.fromEntries(cells.map(({ cell, ...fields }) => [cell, fields]))),
});

const composerCells = (browsers) =>
  browsers.flatMap((browser) => {
    const { shards, workers } = COMPOSER_SHARDS[browser];
    return Array.from({ length: shards }, (_, index) => ({
      cell: `${browser} ${index + 1}/${shards}`,
      browser,
      shard: index + 1,
      total: shards,
      workers,
    }));
  });

// The test step gets an explicit list: moon counts a task whose env input is set as affected, and the
// browser job sets `VITEST_*` inputs, so `moon exec --affected` there would select every target.
const browserCells = (pairs) => {
  const targets = pairs.map(([project, task]) => `${project}:${task}`).sort();
  const total = Math.min(BROWSER_SHARDS, targets.length);
  return Array.from({ length: total }, (_, shard) => ({
    cell: `${shard + 1}/${total}`,
    shard,
    total,
    targets: targets.filter((_, index) => index % total === shard).join(' '),
  }));
};

const restCells = (browsers) =>
  browsers.flatMap((browser) =>
    Array.from({ length: REST_SHARDS }, (_, shard) => ({
      cell: `${browser} ${shard + 1}/${REST_SHARDS}`,
      browser,
      shard,
      total: REST_SHARDS,
    })),
  );

/** Affected `[project, task]` pairs, or undefined for a full run. */
const readAffected = () => {
  const base = process.env.MOON_BASE;
  if (!base) {
    console.error('plan: full run, every cell starts.');
    return undefined;
  }
  // Without `CI`: every e2e task lists it as an input (`.moon/tasks/tag-e2e.yml`), and moon counts a task
  // whose env input is set as affected, which would start every e2e cell whatever changed.
  const { CI: _ci, ...env } = process.env;
  try {
    const config = changedFiles(base).filter((file) => CONFIG_PATH.test(file) && !file.endsWith('.md'));
    if (config.length > 0) {
      console.error(`plan: config changed (${config.slice(0, 5).join(', ')}), every cell starts.`);
      return undefined;
    }
    const pairs = queryTasks(['--affected', '--downstream', 'deep'], env);
    const count = (tasks) => pairs.filter(([, task]) => tasks.has(task)).length;
    const e2e = pairs.filter(([, task]) => task === 'e2e').map(([project]) => project);
    console.error(
      `plan: ${pairs.length} affected tasks; ${count(NODE_TASKS)} node, ${count(BROWSER_TASKS)} browser, e2e: ${e2e.join(' ') || 'none'}.`,
    );
    return pairs;
  } catch (err) {
    console.error(`::warning::plan: could not read the affected tasks (${err.message}); every cell starts.`);
    return undefined;
  }
};

/** `[project, task]` pairs from `moon query tasks`. */
const queryTasks = (args, env = process.env) => {
  const { tasks } = JSON.parse(
    execFileSync('moon', ['query', 'tasks', ...args], {
      encoding: 'utf8',
      env,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
  return Object.entries(tasks).flatMap(([project, projectTasks]) =>
    Object.keys(projectTasks).map((task) => [project, task]),
  );
};

const changedFiles = (base) =>
  execFileSync('git', ['diff', '--name-only', base, process.env.MOON_HEAD ?? 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

main();
