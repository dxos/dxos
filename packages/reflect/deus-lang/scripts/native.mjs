//
// Copyright 2026 DXOS.org
//

// The native CLI that `bin/deus.mjs` runs in place of the seed (D171): one build per seed, cached by
// the seed's hash, made in the background from `deus/`, which compiles to the seed.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const home = join(import.meta.dirname, '..');
const seedPath = join(home, 'seed/deus.image');

/** Where the native CLI for `seed`'s hash lives, under `$XDG_CACHE_HOME` or `~/.cache`. */
const cacheDir = (env, hash) => join(env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'deus/native', hash);

/**
 * The native CLI to run for the checked-in seed, or what to build when there is none: no build when
 * `DEUS_NATIVE=0`, under CI, with `DEUS_SEED` overriding the seed, or without a C compiler.
 */
export const nativeFor = (env) => {
  if (env.DEUS_NATIVE === '0' || env.CI || env.DEUS_SEED || !existsSync(seedPath)) {
    return {};
  }
  const hash = createHash('sha256').update(readFileSync(seedPath)).digest('hex');
  const dir = cacheDir(env, hash);
  const binary = join(dir, 'deus');
  if (existsSync(binary)) {
    return { binary };
  }
  if (spawnSync('cc', ['--version'], { stdio: 'ignore' }).status !== 0) {
    return {};
  }
  return { build: { dir, binary } };
};

/** A build left running longer than this died without removing its lock. */
const STALE_LOCK_MS = 30 * 60 * 1000;

/** Starts `build` detached and niced, unless another build of the same seed holds the lock. */
export const startNativeBuild = ({ dir }) => {
  const lock = join(dir, 'lock');
  try {
    mkdirSync(dir, { recursive: true });
    if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < STALE_LOCK_MS) {
      return;
    }
    writeFileSync(lock, String(process.pid));
  } catch {
    // An unwritable cache only loses the speed-up; the command itself still runs on node.
    return;
  }
  const child = spawn('nice', ['-n', '10', process.execPath, import.meta.filename, dir], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, DEUS_NATIVE: '0' },
  });
  child.unref();
};

/** Builds `Cli.main` with the C back end into `dir/deus`, from a codebase holding the export. */
const build = (dir) => {
  const codebase = join(mkdtempSync(join(tmpdir(), 'deus-native-')), 'codebase');
  const deus = (...args) =>
    execFileSync(process.execPath, [join(home, 'bin/deus.mjs'), ...args, '--codebase', codebase], {
      stdio: 'ignore',
      env: { ...process.env, DEUS_NATIVE: '0' },
    });
  try {
    deus('init', '--empty');
    deus('add', join(home, 'deus'));
    deus('build', 'Cli.main', '-o', join(dir, 'deus.tmp'), '--c');
    renameSync(join(dir, 'deus.tmp'), join(dir, 'deus'));
    rmSync(join(dir, 'deus.tmp.c'), { force: true });
  } finally {
    rmSync(dirname(codebase), { recursive: true, force: true });
    rmSync(join(dir, 'lock'), { force: true });
  }
};

if (process.argv[1] === import.meta.filename) {
  build(process.argv[2]);
}
