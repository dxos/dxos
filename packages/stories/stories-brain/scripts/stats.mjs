//
// Copyright 2026 DXOS.org
//

// Live view of the research bench's shared progress file. The benches stream throttled snapshots to
// `fixtures/local/results/progress.json` (see testing/harness/progress.ts); this renders them as a
// refreshing table with a per-task rate and ETA — the signal that was missing when a full extract
// run silently ground on for hours. (`bench --stats` runs this same view inline; use this script to
// watch a run started elsewhere, e.g. in another terminal or backgrounded.)
//
// Usage (from packages/stories/stories-brain):
//   node scripts/stats.mjs                 # live, redraws every second (Ctrl-C to exit)
//   node scripts/stats.mjs --once          # print one snapshot and exit (good for scripts / non-TTY)
//   node scripts/stats.mjs --interval 500  # custom refresh (ms)
//   node scripts/stats.mjs --file <path>   # a different progress.json
//   moon run stories-brain:stats

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { renderProgress, allTerminal } from './progress-view.mjs';

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
const label = FILE.replace(PACKAGE_ROOT, '');

if (!WATCH) {
  console.log(renderProgress(FILE, Date.now(), label));
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
  process.stdout.write(renderProgress(FILE, Date.now(), label) + '\n');
  // Stay up two frames after everything is terminal so the final numbers are visible, then exit.
  if (allTerminal(FILE)) {
    if (++settleFrames >= 2) {
      restore();
      console.log(renderProgress(FILE, Date.now(), label));
      process.exit(0);
    }
  } else {
    settleFrames = 0;
  }
};

tick();
setInterval(tick, INTERVAL);
