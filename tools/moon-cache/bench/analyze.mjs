// Read moon run reports and say how the cache performed.
//
//   node analyze.mjs .moon/cache/runReport.json   one run, operation breakdown
//   node analyze.mjs .moon-bench                  many runs, compared by arm
//
// In directory mode, `report-<arm><n>.json` groups by arm: report-A1/A2 and report-B1/B2 compare
// arm A against arm B. Reports median, p90, range and coefficient of variation — never a mean,
// because both hosted and self-hosted caches produce multi-x tail runs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const target = process.argv[2] ?? '.moon/cache/runReport.json';
const ms = (op) => (op.duration?.secs ?? 0) * 1000 + (op.duration?.nanos ?? 0) / 1e6;
const secs = (value) => (value / 1000).toFixed(1);

/** Totals for one run, by the operation taxonomy in .agents/projects/ci/REPORT.md. */
const summarise = (path) => {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const totals = { hydration: 0, hits: 0, localHits: 0, hash: 0, executed: 0, execCount: 0, upload: 0 };
  const perTask = [];
  for (const action of report.actions) {
    for (const op of action.operations ?? []) {
      const duration = ms(op);
      switch (op.meta?.type) {
        case 'output-hydration':
          if (op.status === 'cached-from-remote') {
            totals.hydration += duration;
            totals.hits++;
            perTask.push({ target: action.node?.params?.target ?? action.label, ms: duration });
          } else if (op.status === 'cached') {
            totals.localHits++;
          }
          break;
        case 'hash-generation':
          totals.hash += duration;
          break;
        case 'task-execution':
          totals.executed += duration;
          totals.execCount++;
          break;
        case 'archive-creation':
          totals.upload += duration;
          break;
      }
    }
  }
  perTask.sort((a, b) => a.ms - b.ms);
  const quantile = (p) => perTask[Math.min(perTask.length - 1, Math.floor(perTask.length * p))]?.ms ?? 0;
  return {
    ...totals,
    wall: (report.duration?.secs ?? 0) + (report.duration?.nanos ?? 0) / 1e9,
    p50: quantile(0.5),
    p90: quantile(0.9),
    max: perTask.at(-1)?.ms ?? 0,
    slowest: perTask.slice(-10).reverse(),
  };
};

const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const sd = Math.sqrt(sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length);
  return {
    median,
    p90: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))],
    min: sorted[0],
    max: sorted.at(-1),
    cv: mean ? sd / mean : 0,
  };
};

if (statSync(target).isFile()) {
  const run = summarise(target);
  console.log(`wall ${run.wall.toFixed(1)}s`);
  console.log(
    `hydration ${secs(run.hydration)}s over ${run.hits} remote hits (p50 ${run.p50 | 0}ms, p90 ${run.p90 | 0}ms, max ${run.max | 0}ms)`,
  );
  console.log(`local hits ${run.localHits}`);
  console.log(
    `hash-generation ${secs(run.hash)}s   task-execution ${secs(run.executed)}s over ${run.execCount} tasks   upload ${secs(run.upload)}s`,
  );
  if (!run.hits && !run.localHits) {
    console.log('\nNo cache hits at all. Either this is a cold run, or the cache is unreachable —');
    console.log('moon warns once and continues green, so check the log before assuming the former.');
  }
  if (run.slowest.length) {
    console.log('\nslowest hydrations:');
    for (const task of run.slowest) console.log(`  ${(task.ms / 1000).toFixed(2)}s ${task.target}`);
  }
  process.exit(0);
}

const runs = readdirSync(target)
  .filter((file) => /^report-.+\.json$/.test(file))
  .map((file) => ({ label: file.replace(/^report-|\.json$/g, ''), ...summarise(join(target, file)) }))
  .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

if (!runs.length) {
  console.error(`no report-*.json in ${target}`);
  process.exit(1);
}

console.log('rep        wall_s  hydration_s  hits  p50_ms  p90_ms  max_ms  hash_s');
for (const run of runs) {
  console.log(
    `${run.label.padEnd(9)} ${run.wall.toFixed(1).padStart(7)} ${secs(run.hydration).padStart(12)} ${String(run.hits).padStart(5)} ${(run.p50 | 0).toString().padStart(7)} ${(run.p90 | 0).toString().padStart(7)} ${(run.max | 0).toString().padStart(7)} ${secs(run.hash).padStart(7)}`,
  );
}

// Arm = the label without its rep number, so report-A1/report-A2 are one arm.
const arms = new Map();
for (const run of runs) {
  const arm = run.label.replace(/\d+$/, '') || run.label;
  if (!arms.has(arm)) arms.set(arm, []);
  arms.get(arm).push(run);
}

console.log('\narm        n  hits      wall median  wall range          CV  hydration median  per-task p50');
for (const [arm, reps] of arms) {
  const wall = stats(reps.map((rep) => rep.wall));
  const hydration = stats(reps.map((rep) => rep.hydration));
  const perTask = stats(reps.map((rep) => rep.p50));
  const hits = [...new Set(reps.map((rep) => rep.hits))].join('/');
  console.log(
    `${arm.padEnd(9)} ${String(reps.length).padStart(2)}  ${hits.padStart(8)}  ${(wall.median.toFixed(1) + 's').padStart(11)}  ${(wall.min.toFixed(1) + '-' + wall.max.toFixed(1) + 's').padEnd(15)} ${(wall.cv * 100).toFixed(1).padStart(5)}%  ${(secs(hydration.median) + 's').padStart(16)}  ${(perTask.median | 0) + 'ms'}`,
  );
}

if (arms.size > 1) {
  const byWall = [...arms.keys()].sort(
    (a, b) => stats(arms.get(b).map((r) => r.wall)).median - stats(arms.get(a).map((r) => r.wall)).median,
  );
  const [slowest, fastest] = [byWall[0], byWall.at(-1)];
  const ratio = stats(arms.get(slowest).map((r) => r.wall)).median / stats(arms.get(fastest).map((r) => r.wall)).median;
  console.log(`\n${fastest} is ${ratio.toFixed(1)}x faster than ${slowest} on wall clock.`);
  const hitCounts = new Set(runs.map((run) => run.hits));
  if (hitCounts.size > 1) {
    console.log('WARNING: hit counts differ across runs — the arms are not comparable until they match.');
  }
}
