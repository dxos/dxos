#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Prints every task the given targets depend on, transitively, without the targets themselves: what a
// browser cell builds at full concurrency before it runs its tests one at a time.
//
//   node .github/actions/plan/closure.mjs plugin-board:test-storybook react-ui:test-browser

import { execFileSync } from 'node:child_process';

const targets = process.argv.slice(2);
const { tasks } = JSON.parse(
  execFileSync('moon', ['query', 'tasks'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  }),
);

const deps = new Map(
  Object.entries(tasks).flatMap(([project, projectTasks]) =>
    Object.entries(projectTasks).map(([task, config]) => [
      `${project}:${task}`,
      (config.deps ?? []).map((dep) => (typeof dep === 'string' ? dep : dep.target)),
    ]),
  ),
);

const seen = new Set();
const queue = targets.flatMap((target) => deps.get(target) ?? []);
while (queue.length > 0) {
  const target = queue.pop();
  if (!seen.has(target)) {
    seen.add(target);
    queue.push(...(deps.get(target) ?? []));
  }
}

console.log(
  [...seen]
    .filter((target) => !targets.includes(target))
    .sort()
    .join(' '),
);
