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
const cacheDir = (env, hash) => join(env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'deus/native', hash);

/**
 * The native CLI to run for the checked-in seed, or what to build when there is none: no build when
 * `DEUS_NATIVE=0`, under CI, with `DEUS_SEED` overriding the seed, or without a C compiler.
 */
/**
 * Where the hash of the seed at `path` is kept as `<size> <mtime seconds> <hash>`, so a command does not hash 3 MB to
 * find its native CLI; `bin/deus` reads the same file to start that CLI without node (D292).
 */
export const seedIndexPath = (env, path) =>
  join(env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'deus/native/seeds', path.replaceAll('/', '%'));

/** The SHA-256 of the seed image this checkout runs (of `$DEUS_SEED` when set), or undefined without one. */
export const seedHash = (env = process.env) => {
  const path = env.DEUS_SEED ?? seedPath;
  if (!existsSync(path)) {
    return undefined;
  }
  const { size, mtimeMs } = statSync(path);
  const stamp = `${size} ${Math.floor(mtimeMs / 1000)}`;
  const index = seedIndexPath(env, path);
  const kept = existsSync(index) ? readFileSync(index, 'utf8').trim() : '';
  if (kept.startsWith(`${stamp} `)) {
    return kept.slice(stamp.length + 1);
  }
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
  try {
    mkdirSync(dirname(index), { recursive: true });
    writeFileSync(index, `${stamp} ${hash}\n`);
  } catch {
    // A read-only cache only costs the next command the hashing.
  }
  return hash;
};

export const nativeFor = (env) => {
  if (env.DEUS_NATIVE === '0' || env.CI || env.DEUS_SEED || !existsSync(seedPath)) {
    return {};
  }
  const hash = seedHash(env);
  if (hash === undefined) {
    return {};
  }
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

/** The newest native CLI built for another seed in `cache`, or undefined. */
const previousNative = (cache, dir) =>
  readdirSync(cache, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && join(cache, entry.name) !== dir)
    .map((entry) => join(cache, entry.name, 'deus'))
    .filter((binary) => existsSync(binary))
    .map((binary) => ({ binary, at: statSync(binary).mtimeMs }))
    .sort((left, right) => right.at - left.at)[0]?.binary;

/** Runs the CLI on `args`: the native CLI `binary`, or the seed on node without one. */
const runDeus = (binary, args) =>
  binary
    ? execFileSync(binary, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, DEUS_HOME: home, DEUS_KERNEL: 'native', DEUS_NATIVE: '0' },
      })
    : execFileSync(process.execPath, [join(home, 'bin/deus.mjs'), ...args], {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, DEUS_NATIVE: '0' },
      });

/** Whether `binary` (the seed on node without one) compiles `deus/` to the seed: the build is kept under the seed's hash. */
const compilesToSeed = (binary, image) => {
  runDeus(binary, ['compile', join(home, 'deus'), '--main', 'Cli.main', '-o', image]);
  return readFileSync(image).equals(readFileSync(seedPath));
};

/** Writes the C of `Cli.main` from `deus/` to `out` with `binary` (the seed on node without one), in a scratch codebase. */
const writeC = (binary, out) => {
  const scratch = mkdtempSync(join(tmpdir(), 'deus-native-'));
  const codebase = ['--codebase', join(scratch, 'codebase')];
  try {
    runDeus(binary, ['init', '--empty', ...codebase]);
    runDeus(binary, ['add', join(home, 'deus'), ...codebase]);
    runDeus(binary, ['build', 'Cli.main', '-o', out, '--c', ...codebase]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

/** Compiles `c` to `out` as `deus build --c` does (Build.cExecutable), with `flags` before it. */
const cc = (flags, c, out) =>
  execFileSync(process.env.CC ?? 'cc', [...flags, '-DDEUS_MAIN', '-o', out, c], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

/** Link-time optimization splits the one C file into partitions compiled on every core: -O2 in 42 s instead of 107 s (D318). */
const parallelFlags = () => {
  const version = spawnSync(process.env.CC ?? 'cc', ['--version'], { encoding: 'utf8' }).stdout ?? '';
  return version.includes('clang') ? ['-flto=thin'] : ['-flto=auto'];
};

/**
 * Builds `Cli.main` with the C back end into `dir/deus` from `deus/`, or writes `dir/failed.log`. The C is compiled
 * unoptimized first (about 17 s), so the native CLI replaces node within a minute of a seed change, then at `-O2`
 * (twice as fast to run), which replaces it in place (D281). The previous seed's native CLI writes the C in about 8 s
 * where node takes about a minute; the result counts only once the new CLI compiles `deus/` to the seed and writes
 * that same C, which is what node would have written, and otherwise node writes it (D318).
 */
const build = (dir) => {
  const c = join(dir, 'deus.c');
  const tmp = join(dir, 'deus.tmp');
  const image = join(dir, 'check.image');
  try {
    const previous = previousNative(dirname(dir), dir);
    let ready = false;
    if (previous) {
      try {
        writeC(previous, c);
        cc(['-O0'], c, tmp);
        writeC(tmp, join(dir, 'again.c'));
        ready = compilesToSeed(tmp, image) && readFileSync(join(dir, 'again.c')).equals(readFileSync(c));
      } catch {
        ready = false;
      }
    }
    if (!ready) {
      if (!compilesToSeed(undefined, image)) {
        throw new Error('deus/ does not compile to the seed; run scripts/sync-deus.py');
      }
      writeC(undefined, c);
      cc(['-O0'], c, tmp);
    }
    renameSync(tmp, join(dir, 'deus'));
    try {
      cc(['-O2', ...parallelFlags()], c, tmp);
    } catch {
      // A compiler without link-time optimization still builds the program in one piece.
      cc(['-O2'], c, tmp);
    }
    renameSync(tmp, join(dir, 'deus'));
    prune(dirname(dir));
  } catch (error) {
    // Kept until the seed changes, so the launcher warns instead of rebuilding on every command.
    writeFileSync(join(dir, 'failed.log'), `${error.message}\n${error.stderr ?? ''}`);
  } finally {
    for (const file of [c, image, tmp, join(dir, 'again.c')]) {
      rmSync(file, { force: true });
    }
    rmSync(join(dir, 'lock'), { force: true });
  }
};

if (process.argv[1] === import.meta.filename) {
  build(process.argv[2]);
}
