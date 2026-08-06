// Per-job cache stats from a GitHub Actions log, for when the run report is not available —
// e.g. reading a job that has already finished, or one you cannot re-run.
//
//   gh run view --job <id> --log > job.log
//   node parse-ci-log.mjs job.log
//
// moon prints one completion line per task: `▮▮▮▮ <target> (cached from remote, <dur>, <hash>)` for
// a hit and `▮▮▮▮ <target> (<dur>, <hash>)` for an execution. That distinction is the whole basis
// of the numbers. Note logs expire after ~7 days.
import { readFileSync } from 'node:fs';

const duration = (text) => {
  let ms = 0;
  for (const [, value, unit] of text.matchAll(/(\d+)(ms|s|m)(?!s)/g)) {
    ms += +value * (unit === 'ms' ? 1 : unit === 's' ? 1000 : 60000);
  }
  return ms;
};

const lines = readFileSync(process.argv[2], 'utf8')
  .replace(/\x1b\[[0-9;]*[mJK]/g, '')
  .split('\n');

const done = [];
for (const line of lines) {
  const match = line.match(/^(\S+)\s+▮+ (\S+) \((cached from remote, )?([\dsm ]+),\s*[0-9a-f]{8}\)/);
  if (match && /\d/.test(match[4])) {
    done.push({ at: new Date(match[1]), target: match[2], cached: !!match[3], ms: duration(match[4]) });
  }
}

const cached = done.filter((task) => task.cached);
const sum = (tasks) => tasks.reduce((total, task) => total + task.ms, 0);
const span = (Math.max(...done.map((t) => t.at)) - Math.min(...done.map((t) => t.at))) / 1000;

console.log(`${done.length} tasks (${cached.length} cached from remote)`);
console.log(
  `hydration ${(sum(cached) / 1000).toFixed(0)}s, executed ${((sum(done) - sum(cached)) / 1000).toFixed(0)}s`,
);
console.log(`wall ${span.toFixed(0)}s, effective parallelism ${(sum(done) / 1000 / span).toFixed(1)}x`);
for (const task of cached.sort((a, b) => b.ms - a.ms).slice(0, 12)) {
  console.log(`  ${(task.ms / 1000).toFixed(1)}s ${task.target}`);
}
