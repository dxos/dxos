//
// Copyright 2026 DXOS.org
//

// Single entry point for the research bench suite. Parses CLI flags (models, limit, tests, …) with a
// fallback chain of CLI arg > shell env var > `.env` file (git-ignored) > the bench's own default, then
// runs every bench sequentially via run-suite (seeds progress.json, writes stats to
// fixtures/local/results, runs analyze-results).
//
// Usage (from packages/stories/stories-brain):
//   node scripts/bench.mjs --models qwen --limit 10 --tests tags,facts
//   node scripts/bench.mjs -m local -l 5                  # short flags
//   moon run stories-brain:bench -- --models claude-sonnet
//
// Flags fall back to the matching env var (MODELS, LIMIT, TESTS, SUBJECT, SAMPLES, DRAFT_INSTRUCTIONS),
// which may in turn come from a local `.env` file (plain KEY=VALUE; shell env wins over it).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { allTerminal, renderProgress } from './progress-view.mjs';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PROGRESS_FILE = resolve(PACKAGE_ROOT, 'fixtures/local/results/progress.json');
const LOG_FILE = resolve(PACKAGE_ROOT, 'fixtures/local/results/bench.log');

// Seed process.env from a local `.env` (git-ignored) — shell env already set wins over the file.
const loadDotEnv = () => {
  const path = resolve(PACKAGE_ROOT, '.env');
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
};

// Each flag maps to the env var the benches read; `short` mirrors common usage.
const FLAGS = [
  {
    flag: 'models',
    env: 'MODELS',
    short: 'm',
    help: 'model set: local | remote | name substrings',
  },
  {
    flag: 'limit',
    env: 'LIMIT',
    short: 'l',
    help: 'message cap (results → results/partial/)',
  },
  {
    flag: 'tests',
    env: 'TESTS',
    short: 't',
    help: 'comma-separated bench names (subset)',
  },
  {
    flag: 'concurrency',
    env: 'CONCURRENCY',
    short: 'c',
    help: 'extract-facts in-flight parallelism (default: 10 remote / 1 local)',
  },
  {
    flag: 'subject',
    env: 'SUBJECT',
    short: 's',
    help: 'subject for subject-facts / brain-vs-rag',
  },
  {
    flag: 'samples',
    env: 'SAMPLES',
    help: 'max per-variant result rows written to JSON',
  },
  {
    flag: 'draft-instructions',
    env: 'DRAFT_INSTRUCTIONS',
    help: 'user instructions steering the draft bench',
  },
];

const usage = () => {
  console.error('Usage: node scripts/bench.mjs [options]\n\nOptions:');
  for (const { flag, env, short, help } of FLAGS) {
    const names = [short ? `-${short}` : null, `--${flag}`].filter(Boolean).join(', ');
    console.error(`  ${names.padEnd(24)} ${help} (env ${env})`);
  }
  console.error('  --stats                  render the live progress table; tee vitest logs to a file');
  console.error('  -h, --help               show this help');
};

loadDotEnv();

let values;
try {
  ({ values } = parseArgs({
    options: {
      ...Object.fromEntries(FLAGS.map(({ flag, short }) => [flag, { type: 'string', ...(short ? { short } : {}) }])),
      stats: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  }));
} catch (err) {
  console.error(`error: ${err.message}\n`);
  usage();
  process.exit(2);
}

if (values.help) {
  usage();
  process.exit(0);
}

// CLI arg overrides the env var (which may have come from `.env`); an unset flag leaves the env as-is.
for (const { flag, env } of FLAGS) {
  if (values[flag] !== undefined) {
    process.env[env] = values[flag];
  }
}

// Default: stream vitest output to this terminal. With `--stats`, tee that (noisy) output to a log
// file instead and render the live progress table in the foreground — one terminal, live stats.
if (!values.stats) {
  const result = spawnSync('node', ['scripts/run-suite.mjs'], {
    cwd: PACKAGE_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

mkdirSync(dirname(LOG_FILE), { recursive: true });
const logFd = openSync(LOG_FILE, 'w');
const label = PROGRESS_FILE.replace(PACKAGE_ROOT, '');
const tty = Boolean(process.stdout.isTTY);

const child = spawn('node', ['scripts/run-suite.mjs'], {
  cwd: PACKAGE_ROOT,
  env: process.env,
  stdio: ['ignore', logFd, logFd],
});

// On a TTY, redraw in place via the alternate-screen buffer; otherwise append frames.
if (tty) {
  process.stdout.write('\x1b[?1049h');
}
const restore = () => tty && process.stdout.write('\x1b[?1049l');
const draw = () => {
  if (tty) {
    process.stdout.write('\x1b[H\x1b[2J');
  }
  process.stdout.write(renderProgress(PROGRESS_FILE, Date.now(), label) + '\n');
};
const timer = setInterval(() => {
  draw();
  // The child's own exit is the authoritative stop; `allTerminal` just avoids a final stale frame.
  if (allTerminal(PROGRESS_FILE)) {
    draw();
  }
}, 1000);
draw();

process.on('SIGINT', () => {
  clearInterval(timer);
  restore();
  child.kill('SIGINT');
});

child.on('exit', (code) => {
  clearInterval(timer);
  restore();
  console.log(renderProgress(PROGRESS_FILE, Date.now(), label));
  console.log(`\nvitest output → ${LOG_FILE}`);
  process.exit(code ?? 1);
});
