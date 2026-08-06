// Parse .moon/cache/runReport.json into the metrics the benchmark needs.
// Usage: node parse-report.mjs [path/to/runReport.json] [--per-task]
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2] ?? '.moon/cache/runReport.json';
const perTask = process.argv.includes('--per-task');
const dumpArg = process.argv.find((a) => a.startsWith('--dump='));
const report = JSON.parse(readFileSync(path, 'utf8'));

const ms = (op) => (op.duration?.secs ?? 0) * 1000 + (op.duration?.nanos ?? 0) / 1e6;

const totals = {
  hydration_ms: 0,
  remote_hits: 0,
  local_hits: 0,
  local_hit_ms: 0,
  hash_gen_ms: 0,
  archive_ms: 0,
  archive_count: 0,
  exec_ms: 0,
  exec_count: 0,
  setup_ms: 0,
  sync_ms: 0,
};
const tasks = [];
const unknown = {};

for (const action of report.actions) {
  let hyd = 0;
  let exec = 0;
  let hash = 0;
  let arch = 0;
  for (const op of action.operations ?? []) {
    const dur = ms(op);
    switch (op.meta?.type) {
      case 'task-execution':
        // moon 2.4.5 records real task work here; `process-execution` is the pnpm-install setup action.
        totals.exec_ms += dur;
        totals.exec_count++;
        exec += dur;
        break;
      case 'output-hydration':
        if (op.status === 'cached-from-remote') {
          totals.hydration_ms += dur;
          totals.remote_hits++;
          hyd += dur;
        } else if (op.status === 'cached') {
          totals.local_hits++;
          totals.local_hit_ms += dur;
        }
        break;
      case 'hash-generation':
        totals.hash_gen_ms += dur;
        hash += dur;
        break;
      case 'archive-creation':
        totals.archive_ms += dur;
        totals.archive_count++;
        arch += dur;
        break;
      case 'process-execution':
      case 'setup-operation':
        totals.setup_ms += dur;
        break;
      case 'sync-operation':
        totals.sync_ms += dur;
        break;
      case 'no-operation':
        break;
      default:
        unknown[`${op.meta?.type}/${op.status}`] = (unknown[`${op.meta?.type}/${op.status}`] ?? 0) + 1;
    }
  }
  if (hyd || exec || arch) {
    tasks.push({
      target: action.node?.params?.target ?? action.label,
      hydration_ms: hyd,
      exec_ms: exec,
      hash_ms: hash,
      archive_ms: arch,
    });
  }
}

const round = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v)]));
console.log(JSON.stringify(round(totals), null, 2));
if (Object.keys(unknown).length) {
  console.log('UNCLASSIFIED OPS:', JSON.stringify(unknown));
}
if (dumpArg) {
  writeFileSync(dumpArg.slice('--dump='.length), JSON.stringify(tasks, null, 0));
}

const wall = (report.duration?.secs ?? 0) + (report.duration?.nanos ?? 0) / 1e9;
console.log(`wall_clock_s: ${wall.toFixed(1)}`);
console.log(
  `run-task total_s: ${((totals.hydration_ms + totals.hash_gen_ms + totals.exec_ms + totals.archive_ms) / 1000).toFixed(1)}`,
);

if (perTask) {
  console.log('\n-- slowest hydrations --');
  for (const t of tasks.sort((a, b) => b.hydration_ms - a.hydration_ms).slice(0, 20)) {
    console.log(`  ${(t.hydration_ms / 1000).toFixed(2)}s  ${t.target}`);
  }
  const hyds = tasks
    .filter((t) => t.hydration_ms > 0)
    .map((t) => t.hydration_ms)
    .sort((a, b) => a - b);
  if (hyds.length) {
    const q = (p) => hyds[Math.min(hyds.length - 1, Math.floor(hyds.length * p))];
    console.log(`\nhydration p50=${q(0.5) | 0}ms p90=${q(0.9) | 0}ms max=${hyds.at(-1) | 0}ms n=${hyds.length}`);
  }
}
