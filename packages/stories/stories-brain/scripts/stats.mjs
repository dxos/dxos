//
// Copyright 2026 DXOS.org
//

// Live view of the research bench's shared progress file. The benches stream throttled snapshots to
// `fixtures/local/results/progress.json` (see testing/harness/progress.ts); this renders them as a
// refreshing table with a per-task rate and ETA — the signal that was missing when a full extract
// run silently ground on for hours.
//
// Usage (from packages/stories/stories-brain):
//   node scripts/stats.mjs                 # live, redraws every second (Ctrl-C to exit)
//   node scripts/stats.mjs --once          # print one snapshot and exit (good for scripts / non-TTY)
//   node scripts/stats.mjs --interval 500  # custom refresh (ms)
//   node scripts/stats.mjs --file <path>   # a different progress.json
//   moon run stories-brain:stats

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const DEFAULT_FILE = resolve(PACKAGE_ROOT, 'fixtures/local/results/progress.json');

const { values } = parseArgs({
  options: {
    file: { type: 'string', short: 'f' },
    interval: { type: 'string', short: 'i' },
    once: { type: 'boolean' },
    watch: { type: 'boolean', short: 'w' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.error(
    'Usage: node scripts/stats.mjs [--file <progress.json>] [--interval <ms>] [--once] [--watch]\n' +
      '  Live table of the bench progress file with per-task rate + ETA.',
  );
  process.exit(0);
}

const FILE = values.file ? resolve(values.file) : DEFAULT_FILE;
const INTERVAL = values.interval ? Math.max(100, Number(values.interval)) : 1000;
// Watch on a TTY by default; a pipe / `--once` prints a single snapshot.
const WATCH = values.once ? false : (values.watch ?? Boolean(process.stdout.isTTY));

const ICON = { pending: '◦', running: '▶', done: '✔', error: '✗' };
const BAR_WIDTH = 16;

const pad = (text, width) => {
  const string = String(text);
  return string.length >= width ? string.slice(0, width) : string + ' '.repeat(width - string.length);
};

const padLeft = (text, width) => {
  const string = String(text);
  return string.length >= width ? string : ' '.repeat(width - string.length) + string;
};

/** `93s` under a minute, else `1m03s`, else `1h02m`. */
const duration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m${padLeft(seconds, 2).replace(' ', '0')}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h${padLeft(minutes % 60, 2).replace(' ', '0')}m`;
};

const bar = (current, total) => {
  if (!total) {
    return ' '.repeat(BAR_WIDTH);
  }
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((current / total) * BAR_WIDTH)));
  return '█'.repeat(filled) + '·'.repeat(BAR_WIDTH - filled);
};

// Elapsed for an in-flight task: its own `elapsedMs` if the reporter set one, else now − startedAt.
const elapsedOf = (task, nowMs) => {
  if (Number.isFinite(task.elapsedMs)) {
    return task.elapsedMs;
  }
  const started = task.startedAt ? Date.parse(task.startedAt) : NaN;
  return Number.isFinite(started) ? nowMs - started : NaN;
};

const render = (nowMs) => {
  if (!existsSync(FILE)) {
    return `no progress file yet: ${FILE}`;
  }
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    // A concurrent writer may catch us mid-write; skip this frame.
    return 'progress file busy…';
  }
  const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  if (tasks.length === 0) {
    return 'no tasks yet.';
  }

  const nameWidth = Math.min(32, Math.max(12, ...tasks.map((task) => task.name.length)));
  const header =
    `${pad('', 2)} ${pad('TASK', nameWidth)}  ${pad('PROGRESS', BAR_WIDTH)} ${pad('', 11)} ` +
    `${pad('RATE', 9)} ${pad('ELAPSED', 8)} ${pad('ETA', 8)}`;

  const lines = tasks.map((task) => {
    const { current = 0, total, status = 'pending', name } = task;
    const icon = ICON[status] ?? '?';
    const elapsedMs = elapsedOf(task, nowMs);
    const rate = Number.isFinite(elapsedMs) && elapsedMs > 0 ? current / (elapsedMs / 1000) : NaN;
    const remaining = total && current < total && rate > 0 ? ((total - current) / rate) * 1000 : NaN;
    const count = total ? `${current}/${total}` : `${current}`;
    const percent = total ? `${Math.round((current / total) * 100)}%` : '';
    const rateText = Number.isFinite(rate) ? `${rate.toFixed(2)}/s` : '—';
    const elapsedText = status === 'pending' ? '—' : duration(elapsedMs);
    const etaText = status === 'running' ? duration(remaining) : status === 'pending' ? '—' : 'done';
    const note = task.note ? `  ${task.note}` : task.error ? `  ⚠ ${task.error}` : '';
    return (
      `${icon}  ${pad(name, nameWidth)}  ${bar(current, total)} ${pad(`${count} ${percent}`, 11)} ` +
      `${pad(rateText, 9)} ${pad(elapsedText, 8)} ${pad(etaText, 8)}${note}`
    );
  });

  const leaves = tasks.filter((task) => Number.isFinite(task.total) && task.name.includes(':'));
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const errorCount = tasks.filter((task) => task.status === 'error').length;
  const curSum = leaves.reduce((sum, task) => sum + (task.current ?? 0), 0);
  const totalSum = leaves.reduce((sum, task) => sum + (task.total ?? 0), 0);
  const summary =
    `${doneCount} done, ${errorCount} error, ${tasks.length} tasks` +
    (totalSum ? ` · ${curSum}/${totalSum} items` : '') +
    ` · updated ${snapshot.updatedAt ?? '—'}`;

  return [`research bench — live stats   (${FILE.replace(PACKAGE_ROOT, '')})`, '', header, ...lines, '', summary].join(
    '\n',
  );
};

const allTerminal = () => {
  if (!existsSync(FILE)) {
    return false;
  }
  try {
    const tasks = JSON.parse(readFileSync(FILE, 'utf8')).tasks ?? [];
    return tasks.length > 0 && tasks.every((task) => task.status === 'done' || task.status === 'error');
  } catch {
    return false;
  }
};

if (!WATCH) {
  console.log(render(Date.now()));
  process.exit(0);
}

// Live: alternate-screen buffer so the terminal scrollback is preserved on exit.
process.stdout.write('\x1b[?1049h');
const restore = () => process.stdout.write('\x1b[?1049l');
process.on('SIGINT', () => {
  restore();
  process.exit(0);
});

let settleFrames = 0;
const tick = () => {
  process.stdout.write('\x1b[H\x1b[2J');
  process.stdout.write(render(Date.now()) + '\n');
  // Stay up two frames after everything is terminal so the final numbers are visible, then exit.
  if (allTerminal()) {
    if (++settleFrames >= 2) {
      restore();
      console.log(render(Date.now()));
      process.exit(0);
    }
  } else {
    settleFrames = 0;
  }
};

tick();
setInterval(tick, INTERVAL);
