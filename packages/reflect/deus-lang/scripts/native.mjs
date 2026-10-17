//
// Copyright 2026 DXOS.org
//

// The native CLI that `bin/deus.mjs` runs in place of the seed (D171): one build per seed, cached by
// the seed's hash, made in the background from `deus/`, which compiles to the seed.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
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
/** The SHA-256 of the seed image this checkout runs (of `$DEUS_SEED` when set), or undefined without one. */
export const seedHash = (env = process.env) => {
  const path = env.DEUS_SEED ?? seedPath;
  return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : undefined;
};

export const nativeFor = (env) => {
  if (env.DEUS_NATIVE === '0' || env.CI || env.DEUS_SEED || !existsSync(seedPath)) {
    return {};
  }
  const hash = seedHash(env);
  const dir = cacheDir(env, hash);
  const binary = join(dir, 'deus');
  if (existsSync(binary)) {
    return { binary };
  }
  const failed = join(dir, 'failed.log');
  if (existsSync(failed)) {
    return { failed };
  }
  if (spawnSync(env.CC ?? 'cc', ['--version'], { stdio: 'ignore' }).status !== 0) {
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

/** Earlier native builds kept beside the new one, so switching back to a recent seed needs no rebuild. */
const KEPT_BUILDS = 3;

/** Removes all but the newest build and the `KEPT_BUILDS` before it from `cache`, which otherwise grows by one folder per seed. */
const prune = (cache) => {
  const builds = readdirSync(cache, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ path: join(cache, entry.name), at: statSync(join(cache, entry.name)).mtimeMs }))
    .sort((left, right) => right.at - left.at);
  for (const build of builds.slice(KEPT_BUILDS + 1)) {
    // A build still holding its lock is running; it is never pruned.
    if (!existsSync(join(build.path, 'lock'))) {
      rmSync(build.path, { recursive: true, force: true });
    }
  }
};

/**
 * Builds `Cli.main` with the C back end into `dir/deus` from `deus/`, or writes `dir/failed.log`. The C is written
 * once and compiled twice: unoptimized first (about 18 s), so the native CLI replaces node within a minute of a seed
 * change, then at `-O2` (about 100 s, twice as fast to run), which replaces it in place (D281).
 */
const build = (dir) => {
  const codebase = join(mkdtempSync(join(tmpdir(), 'deus-native-')), 'codebase');
  const deus = (...args) =>
    execFileSync(process.execPath, [join(home, 'bin/deus.mjs'), ...args, '--codebase', codebase], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, DEUS_NATIVE: '0' },
    });
  try {
    // The build is kept under the seed's hash, so it must be of the code the seed is: deus/ has to compile to it.
    execFileSync(
      process.execPath,
      [join(home, 'bin/deus.mjs'), 'compile', join(home, 'deus'), '--main', 'Cli.main', '-o', join(dir, 'check.image')],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, DEUS_NATIVE: '0' },
      },
    );
    if (!readFileSync(join(dir, 'check.image')).equals(readFileSync(seedPath))) {
      throw new Error('deus/ does not compile to the seed; run scripts/sync-deus.py');
    }
    deus('init', '--empty');
    deus('add', join(home, 'deus'));
    deus('build', 'Cli.main', '-o', join(dir, 'deus.c'), '--c');
    // As `deus build --c` compiles it (Build.cExecutable), at each level in turn.
    for (const level of ['-O0', '-O2']) {
      execFileSync(process.env.CC ?? 'cc', [level, '-DDEUS_MAIN', '-o', join(dir, 'deus.tmp'), join(dir, 'deus.c')], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      renameSync(join(dir, 'deus.tmp'), join(dir, 'deus'));
    }
    prune(dirname(dir));
  } catch (error) {
    // Kept until the seed changes, so the launcher warns instead of rebuilding on every command.
    writeFileSync(join(dir, 'failed.log'), `${error.message}\n${error.stderr ?? ''}`);
  } finally {
    rmSync(join(dir, 'deus.c'), { force: true });
    rmSync(join(dir, 'check.image'), { force: true });
    rmSync(join(dir, 'deus.tmp'), { force: true });
    rmSync(dirname(codebase), { recursive: true, force: true });
    rmSync(join(dir, 'lock'), { force: true });
  }
};

if (process.argv[1] === import.meta.filename) {
  build(process.argv[2]);
}
