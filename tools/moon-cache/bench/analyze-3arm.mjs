// Three-arm summary from the Stage B reports. Usage: node analyze-3arm.mjs <dir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const ms = (op) => (op.duration?.secs ?? 0) * 1000 + (op.duration?.nanos ?? 0) / 1e6;
const NAMES = { A: 'Depot', B: 'loopback', C: 'DO NYC3 droplet' };

const reps = [];
for (const file of readdirSync(dir).filter((f) => /^report-[ABC]\d+\.json$/.test(f))) {
  const label = file.replace(/^report-|\.json$/g, '');
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  let hydration = 0;
  let hits = 0;
  let hash = 0;
  const per = [];
  for (const action of report.actions) {
    for (const op of action.operations ?? []) {
      const dur = ms(op);
      if (op.meta?.type === 'output-hydration' && op.status === 'cached-from-remote') {
        hydration += dur;
        hits++;
        per.push(dur);
      }
      if (op.meta?.type === 'hash-generation') hash += dur;
    }
  }
  per.sort((a, b) => a - b);
  const q = (p) => per[Math.min(per.length - 1, Math.floor(per.length * p))] ?? 0;
  reps.push({
    label,
    arm: label[0],
    wall: (report.duration?.secs ?? 0) + (report.duration?.nanos ?? 0) / 1e9,
    hydration,
    hits,
    hash,
    p50: q(0.5),
    p90: q(0.9),
    max: per.at(-1) ?? 0,
  });
}
reps.sort((a, b) => a.label.slice(1) - b.label.slice(1) || a.label.localeCompare(b.label));

console.log('rep   arm              wall_s  hydration_s  hits  p50_ms  p90_ms  max_ms  hash_s');
for (const r of reps) {
  console.log(
    `${r.label.padEnd(5)} ${NAMES[r.arm].padEnd(16)} ${r.wall.toFixed(1).padStart(6)} ${(r.hydration / 1000).toFixed(1).padStart(12)} ${String(r.hits).padStart(5)} ${(r.p50 | 0).toString().padStart(7)} ${(r.p90 | 0).toString().padStart(7)} ${(r.max | 0).toString().padStart(7)} ${(r.hash / 1000).toFixed(1).padStart(7)}`,
  );
}

const stat = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const mean = s.reduce((t, v) => t + v, 0) / s.length;
  const sd = Math.sqrt(s.reduce((t, v) => t + (v - mean) ** 2, 0) / s.length);
  return {
    median,
    p90: s[Math.min(s.length - 1, Math.floor(s.length * 0.9))],
    min: s[0],
    max: s.at(-1),
    cv: sd / mean,
  };
};

console.log('\narm              n  hits  hyd_median  hyd_p90  wall_median  wall_range        wall_cv  p50/task');
const summary = {};
for (const arm of ['A', 'B', 'C']) {
  const rs = reps.filter((r) => r.arm === arm);
  if (!rs.length) continue;
  const h = stat(rs.map((r) => r.hydration / 1000));
  const w = stat(rs.map((r) => r.wall));
  const p = stat(rs.map((r) => r.p50));
  summary[arm] = { h, w, p };
  console.log(
    `${NAMES[arm].padEnd(16)} ${rs.length}  ${[...new Set(rs.map((r) => r.hits))].join('/').padStart(4)}  ${h.median.toFixed(1).padStart(10)}  ${h.p90.toFixed(1).padStart(7)}  ${w.median.toFixed(1).padStart(11)}  ${(w.min.toFixed(1) + '-' + w.max.toFixed(1) + ' s').padEnd(16)}  ${(w.cv * 100).toFixed(1).padStart(6)}%  ${(p.median | 0) + ' ms'}`,
  );
}

if (summary.A && summary.C) {
  console.log(
    `\ndroplet vs Depot: hydration ${(summary.A.h.median / summary.C.h.median).toFixed(1)}x, wall ${(summary.A.w.median / summary.C.w.median).toFixed(1)}x, per-task p50 ${(summary.A.p.median / summary.C.p.median).toFixed(1)}x`,
  );
  console.log(
    `droplet vs loopback: hydration ${(summary.C.h.median / summary.B.h.median).toFixed(1)}x, wall ${(summary.C.w.median / summary.B.w.median).toFixed(1)}x`,
  );
}
