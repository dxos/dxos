#!/usr/bin/env node

// Every cached task in a project pnpm installs must carry the `dependency-closure` toolchain, or its key
// misses the project's dependencies. moon adds it to tasks that use `javascript` or `node`
// (`tools/moon-dependency-closure`), so a task configured with only other toolchains loses it silently.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const query = (kind) =>
  JSON.parse(execFileSync('moon', ['query', kind], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));

const sources = new Map(query('projects').projects.map(({ id, source }) => [id, source]));
const missing = Object.entries(query('tasks').tasks).flatMap(([project, tasks]) =>
  Object.entries(tasks)
    .filter(([, task]) => task.options?.cache !== false && !task.toolchains?.includes('dependency-closure'))
    .filter(() => existsSync(join(sources.get(project), 'package.json')))
    .map(([name, task]) => `  ${project}:${name}  toolchains: ${(task.toolchains ?? []).join(', ')}`),
);

if (missing.length > 0) {
  console.error('Cached tasks without the dependency-closure toolchain:\n');
  console.error(missing.join('\n'));
  console.error(`
Add \`dependency-closure\` to each task's \`toolchains\`, as \`.moon/tasks/typescript.yml\` does for lint.`);
  process.exit(1);
}
