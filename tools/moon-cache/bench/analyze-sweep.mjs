// Fit hydration-vs-RTT from the sweep reports. Usage: node analyze-sweep.mjs <scratchpad-dir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const ms = (op) => (op.duration?.secs ?? 0) * 1000 + (op.duration?.nanos ?? 0) / 1e6;

const byRtt = new Map();
for (const file of readdirSync(dir).filter((f) => /^sweep-report-\d+-\d+\.json$/.test(f))) {
  const [, rtt] = file.match(/^sweep-report-(\d+)-\d+\.json$/);
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  let hydration = 0;
  let hits = 0;
  for (const action of report.actions) {
    for (const op of action.operations ?? []) {
      if (op.meta?.type === 'output-hydration' && op.status === 'cached-from-remote') {
        hydration += ms(op);
        hits++;
      }
    }
  }
  const wall = (report.duration?.secs ?? 0) + (report.duration?.nanos ?? 0) / 1e9;
  if (!byRtt.has(+rtt)) byRtt.set(+rtt, []);
  byRtt.get(+rtt).push({ hydration, hits, wall });
}

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const rows = [...byRtt.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([rtt, reps]) => ({
    rtt,
    hydration: median(reps.map((r) => r.hydration)),
    wall: median(reps.map((r) => r.wall)),
    hits: [...new Set(reps.map((r) => r.hits))].join('/'),
    n: reps.length,
  }));

console.log('rtt_ms  n  hits  hydration_ms  delta_vs_0  wall_s');
const base = rows[0]?.hydration ?? 0;
for (const r of rows) {
  console.log(
    `${String(r.rtt).padStart(6)}  ${r.n}  ${r.hits.padStart(4)}  ${(r.hydration | 0).toString().padStart(12)}  ${(((r.hydration - base) | 0) >= 0 ? '+' : '') + ((r.hydration - base) | 0)}`.padEnd(
      52,
    ) + r.wall.toFixed(1).padStart(7),
  );
}

// Least-squares slope of hydration (ms) against RTT (ms).
const n = rows.length;
if (n > 1) {
  const sx = rows.reduce((t, r) => t + r.rtt, 0);
  const sy = rows.reduce((t, r) => t + r.hydration, 0);
  const sxy = rows.reduce((t, r) => t + r.rtt * r.hydration, 0);
  const sxx = rows.reduce((t, r) => t + r.rtt * r.rtt, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const tasks = Number(rows[0].hits.split('/')[0]);
  console.log(`\nslope: ${slope.toFixed(1)} ms hydration per 1 ms RTT over ${tasks} tasks`);
  console.log(
    `     = ${(slope / tasks).toFixed(2)} ms per task per ms RTT  (~${(slope / tasks).toFixed(1)} sequential round-trips per cached task)`,
  );
  const wallSlope = (() => {
    const wy = rows.reduce((t, r) => t + r.wall, 0);
    const wxy = rows.reduce((t, r) => t + r.rtt * r.wall, 0);
    return (n * wxy - sx * wy) / (n * sxx - sx * sx);
  })();
  console.log(`wall-clock slope: ${(wallSlope * 1000).toFixed(1)} ms per 1 ms RTT`);
}
