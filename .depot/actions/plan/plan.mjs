#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Decides which test and e2e cells a Check run starts, so a change that touches none of a suite's
// targets starts none of its runners. Reads the affected scope the `affected` action exported: with
// MOON_BASE unset it is a full run and every cell starts. `--downstream deep` counts a task as affected
// when anything it depends on changed. A change to CI, toolchain or root config is an input of no task
// yet changes how every test runs, so it starts every cell too, as does any failure: skipping a suite
// that should have run is the one outcome this must never produce.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const NODE_TASKS = new Set(['test', 'test-workerd']);
const BROWSER_TASKS = new Set(['test-browser', 'test-storybook']);
// CI workflows and actions, moon and toolchain config, patches, and root files other than docs.
const CONFIG_PATH = /^(?:\.depot|\.github|\.moon|patches)\/|^[^/]+$/;

const main = () => {
  const browsers = pickBrowsers(process.env.GITHUB_EVENT_NAME ?? '', process.env.GITHUB_REF ?? '');
  const affected = readAffected();
  const plan = {
    browsers,
    node: affected?.some(([, task]) => NODE_TASKS.has(task)) ?? true,
    browser: affected?.some(([, task]) => BROWSER_TASKS.has(task)) ?? true,
    memory: affected?.some(([project, task]) => project === 'echo-client-e2e' && task === 'test') ?? true,
    composer: affected?.some(([project, task]) => project === 'composer-e2e' && task === 'e2e') ?? true,
    rest: affected?.some(([project, task]) => project !== 'composer-e2e' && task === 'e2e') ?? true,
  };
  const outputs = {
    'node': String(plan.node),
    'browser': String(plan.browser),
    'memory': String(plan.memory),
    'composer-browsers': JSON.stringify(plan.composer ? browsers : []),
    'rest-browsers': JSON.stringify(plan.rest ? browsers : []),
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

/** Chromium gates PRs and the merge queue; a push to main runs the other two, since the queue already ran Chromium on that tree. */
const pickBrowsers = (event, ref) => {
  if (event === 'pull_request' || event === 'merge_group') {
    return ['chromium'];
  }
  if (event === 'push' && ref === 'refs/heads/main') {
    return ['firefox', 'webkit'];
  }
  return ['chromium', 'firefox', 'webkit'];
};

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
    const { tasks } = JSON.parse(
      execFileSync('moon', ['query', 'tasks', '--affected', '--downstream', 'deep'], {
        encoding: 'utf8',
        env,
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'inherit'],
      }),
    );
    const pairs = Object.entries(tasks).flatMap(([project, projectTasks]) =>
      Object.keys(projectTasks).map((task) => [project, task]),
    );
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

const changedFiles = (base) =>
  execFileSync('git', ['diff', '--name-only', base, process.env.MOON_HEAD ?? 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

main();
