// Compare arms from the saved runReports. Usage: node analyze-ab.mjs <scratchpad-dir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const ms = (op) => (op.duration?.secs ?? 0) * 1000 + (op.duration?.nanos ?? 0) / 1e6;

const reps = [];
for (const file of readdirSync(dir).filter((f) => /^report-.+\.json$/.test(f))) {
  const label = file.replace(/^report-|\.json$/g, '');
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  let hydration = 0;
  let hits = 0;
  let hash = 0;
  let exec = 0;
  let archive = 0;
  const perTask = [];
  for (const action of report.actions) {
    for (const op of action.operations ?? []) {
      const dur = ms(op);
      if (op.meta?.type === 'output-hydration' && op.status === 'cached-from-remote') {
        hydration += dur;
        hits++;
        perTask.push({ target: action.node?.params?.target ?? action.label, ms: dur });
      }
      if (op.meta?.type === 'hash-generation') hash += dur;
      if (op.meta?.type === 'task-execution') exec += dur;
      if (op.meta?.type === 'archive-creation') archive += dur;
    }
  }
  const wall = (report.duration?.secs ?? 0) + (report.duration?.nanos ?? 0) / 1e9;
  const sorted = perTask.map((t) => t.ms).sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0);
  reps.push({
    label,
    arm: label.replace(/[0-9]|prime-/g, ''),
    wall,
    hydration,
    hits,
    hash,
    exec,
    archive,
    p50: q(0.5),
    p90: q(0.9),
    max: sorted.at(-1) ?? 0,
    perTask,
  });
}

reps.sort((a, b) => a.label.localeCompare(b.label));

console.log('label      arm  wall_s  hydration_s  hits  p50_ms  p90_ms  max_ms  hash_s  exec_s  upload_s');
for (const r of reps) {
  console.log(
    `${r.label.padEnd(9)}  ${r.arm.padEnd(3)}  ${r.wall.toFixed(1).padStart(6)}  ${(r.hydration / 1000).toFixed(1).padStart(11)}  ${String(r.hits).padStart(4)}  ${(r.p50 | 0).toString().padStart(6)}  ${(r.p90 | 0).toString().padStart(6)}  ${(r.max | 0).toString().padStart(6)}  ${(r.hash / 1000).toFixed(1).padStart(6)}  ${(r.exec / 1000).toFixed(1).padStart(6)}  ${(r.archive / 1000).toFixed(1).padStart(8)}`,
  );
}

const measured = reps.filter((r) => !r.label.startsWith('prime'));
const stat = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const p90 = s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
  const mean = s.reduce((t, v) => t + v, 0) / s.length;
  const sd = Math.sqrt(s.reduce((t, v) => t + (v - mean) ** 2, 0) / s.length);
  return { median, p90, min: s[0], max: s.at(-1), cv: sd / mean };
};

console.log('\n-- summary over measured reps (A = Depot, B = loopback bazel-remote) --');
for (const arm of ['A', 'B']) {
  const armReps = measured.filter((r) => r.arm === arm);
  if (!armReps.length) continue;
  const hyd = stat(armReps.map((r) => r.hydration / 1000));
  const wall = stat(armReps.map((r) => r.wall));
  const hits = [...new Set(armReps.map((r) => r.hits))];
  console.log(
    `${arm} n=${armReps.length} hits=${hits.join('/')}  hydration median=${hyd.median.toFixed(1)}s p90=${hyd.p90.toFixed(1)}s range=${hyd.min.toFixed(1)}-${hyd.max.toFixed(1)}s cv=${(hyd.cv * 100).toFixed(1)}%  wall median=${wall.median.toFixed(1)}s range=${wall.min.toFixed(1)}-${wall.max.toFixed(1)}s cv=${(wall.cv * 100).toFixed(1)}%`,
  );
}
