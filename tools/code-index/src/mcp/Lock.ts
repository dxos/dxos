//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Clock from 'effect/Clock';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Result from 'effect/Result';
import * as Scope from 'effect/Scope';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, readlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import * as Native from '../internal/native.ts';
import * as Store from '../Store.ts';

/**
 * Names the process holding a store open. RocksDB locks its directory for as long as a writer has
 * it open, so a second opener fails, and "locked" alone leaves the user hunting for which `index`,
 * `serve` or `mcp` to stop.
 */

export type Holder = {
  readonly pid: number;
  readonly command: string;
};

/** The lock file of each RocksDB database a store holds. */
export const lockFiles = (dir: string): string[] => [
  join(dir, Native.DIR, 'oxigraph', 'LOCK'),
  join(dir, Native.DIR, 'journal', 'LOCK'),
];

const run = promisify(execFile);

/** Linux exposes every process's descriptors under `/proc`, so no external tool is needed there. */
const procHolders = async (target: string): Promise<number[]> => {
  const pids: number[] = [];
  for (const entry of await readdir('/proc')) {
    if (!/^\d+$/.test(entry)) {
      continue;
    }
    // Descriptors of another user's processes are unreadable; those cannot be ours to stop anyway.
    const fds = await readdir(join('/proc', entry, 'fd')).catch((): string[] => []);
    for (const fd of fds) {
      const link = await readlink(join('/proc', entry, 'fd', fd)).catch(() => undefined);
      if (link === target) {
        pids.push(Number(entry));
        break;
      }
    }
  }
  return pids;
};

/** `lsof` exits 1 when nothing has the file open, which is an answer rather than a failure. */
const lsofHolders = async (target: string): Promise<number[]> => {
  const { stdout } = await run('lsof', ['-t', '--', target]).catch(() => ({ stdout: '' }));
  return stdout
    .split('\n')
    .filter((line) => /^\d+$/.test(line.trim()))
    .map(Number);
};

const commandOf = async (pid: number): Promise<string> => {
  if (existsSync(`/proc/${pid}/cmdline`)) {
    const text = await readFile(`/proc/${pid}/cmdline`, 'utf8').catch(() => '');
    return text.split('\0').filter(Boolean).join(' ');
  }
  const { stdout } = await run('ps', ['-o', 'command=', '-p', String(pid)]).catch(() => ({ stdout: '' }));
  return stdout.trim();
};

/** Every other process with one of the store's lock files open. */
export const holders = (dir: string): Effect.Effect<Holder[]> =>
  Effect.promise(async () => {
    const pids = new Set<number>();
    for (const file of lockFiles(dir)) {
      if (!existsSync(file)) {
        continue;
      }
      const target = await realpath(file);
      const found = existsSync('/proc/self/fd') ? await procHolders(target) : await lsofHolders(target);
      for (const pid of found) {
        if (pid !== process.pid) {
          pids.add(pid);
        }
      }
    }
    return Promise.all(
      [...pids].sort((left, right) => left - right).map(async (pid) => ({ pid, command: await commandOf(pid) })),
    );
  });

/** The subcommand a code-index holder runs, if its command line is one. */
const subcommandOf = (command: string): string | undefined => {
  const match = /(?:^|[\s/])code-index(?:\.ts)?(?=\s|$)(?:\s+([a-z]+))?/.exec(command);
  return match === null ? undefined : (match[1] ?? 'serve');
};

/** Which code-index command a holder's command line is, so the message says what to stop; no subcommand is `serve`. */
const role = (command: string): string | undefined => {
  const subcommand = subcommandOf(command);
  if (subcommand === undefined) {
    return undefined;
  }
  return subcommand === 'mcp' ? 'another `code-index mcp`' : `\`code-index ${subcommand}\``;
};

const describeHolder = (holder: Holder): string => {
  const what = role(holder.command);
  return `pid ${holder.pid} (${what === undefined ? holder.command || 'unknown command' : `${what}: ${holder.command}`})`;
};

/**
 * RocksDB says "lock" when another process holds the directory, but the store wraps that in its own
 * "failed to open" error, so the whole cause chain is searched.
 */
export const isLockError = (error: unknown): boolean => {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (/\block\b|LOCK/.test(current.message)) {
      return true;
    }
  }
  return false;
};

const ADVICE =
  'A store has one holder at a time — `code-index index`, `code-index serve` or another `code-index mcp` — ' +
  'so stop that process, or pass --store a copy of the store directory.';

/**
 * Rewrites a failure to open the store as one naming the processes that hold it, when there are
 * any; a lock failure whose holder cannot be found still names what can hold it.
 */
export const explain = (dir: string, error: Store.StoreError): Effect.Effect<never, Store.StoreError> =>
  Effect.flatMap(holders(dir), (found) =>
    Effect.fail(
      found.length > 0
        ? new Store.StoreError({
            message: `The store at ${dir} is held open by ${found.map(describeHolder).join(', ')}. ${ADVICE}`,
            // The database's own lock message only repeats this one, less helpfully.
            cause: isLockError(error) ? undefined : error,
          })
        : isLockError(error)
          ? new Store.StoreError({
              message: `The store at ${dir} is locked by another process whose PID could not be found. ${ADVICE}`,
            })
          : error,
    ),
  );

/** Holders that keep the store until stopped; waiting on one of them can only time out. */
const LONG_LIVED = new Set(['serve', 'mcp', 'chat']);

/** Only a holder known to finish on its own (`index`, `query`, ...) is worth waiting for. */
export const isTransient = (holder: Holder): boolean => {
  const subcommand = subcommandOf(holder.command);
  return subcommand !== undefined && !LONG_LIVED.has(subcommand);
};

export type WaitOptions = {
  /** How long to wait for a transient holder before failing (default 2 min). */
  readonly timeout?: Duration.Input;
  /** How often to retry the open while waiting (default 1 s). */
  readonly interval?: Duration.Input;
};

/**
 * Opens the store with `open`. A lock held by a command that finishes on its own (or by a process
 * that cannot be identified) is waited for, with one line saying so; one held by `serve`, `mcp` or
 * `chat`, or still held at the deadline, fails with the holders named. The retry is a loop over
 * builds rather than a recursive `Layer.catchTag`, because a recovered layer is rebuilt for every
 * consumer of it, which would race several opens of one store.
 */
export const layer = (
  dir: string,
  open: () => Layer.Layer<Store.Store, Store.StoreError>,
  { timeout = Duration.minutes(2), interval = Duration.seconds(1) }: WaitOptions = {},
): Layer.Layer<Store.Store, Store.StoreError> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const deadline = (yield* Clock.currentTimeMillis) + Duration.toMillis(timeout);
      let announced = false;
      while (true) {
        // Each attempt gets its own scope so a failed one closes whatever it opened before failing; it
        // is tied to the layer's scope before the build starts, so an interrupted build releases the lock.
        const scope = yield* Effect.uninterruptible(
          Effect.tap(Scope.make(), (attempt) => Effect.addFinalizer((outer) => Scope.close(attempt, outer))),
        );
        const result = yield* Effect.result(Layer.buildWithScope(open(), scope));
        if (Result.isSuccess(result)) {
          return result.success;
        }
        const error = result.failure;
        yield* Scope.close(scope, Exit.fail(error));
        if (!isLockError(error)) {
          return yield* explain(dir, error);
        }
        const found = yield* holders(dir);
        const now = yield* Clock.currentTimeMillis;
        if (now >= deadline || !found.every(isTransient)) {
          return yield* explain(dir, error);
        }
        if (!announced) {
          announced = true;
          const who = found.length > 0 ? found.map(describeHolder).join(', ') : 'another process';
          yield* Console.error(
            `Waiting up to ${Duration.format(Duration.seconds(Math.ceil((deadline - now) / 1000)))} for the store at ${dir}, held by ${who}…`,
          );
        }
        yield* Effect.sleep(interval);
      }
    }),
  );
