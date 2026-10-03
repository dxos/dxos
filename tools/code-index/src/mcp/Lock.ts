//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, readlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import * as Native from '../internal/native.ts';
import * as Quadstore from '../internal/quadstore.ts';
import * as Store from '../Store.ts';

/**
 * Names the process holding a store open. Both graph backends lock their directory for as long as
 * a writer has it open (LevelDB and RocksDB alike), so a second opener fails, and "locked" alone
 * leaves the user hunting for which `index`, `serve` or `mcp` to stop.
 */

export type Holder = {
  readonly pid: number;
  readonly command: string;
};

/** The lock file of each database a store may hold; only the backend in use will exist. */
export const lockFiles = (dir: string): string[] => [
  join(dir, Quadstore.DIR, 'LOCK'),
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

/** Which code-index command a holder's command line is, so the message says what to stop; no subcommand is `serve`. */
const role = (command: string): string | undefined => {
  const match = /(?:^|[\s/])code-index(?:\.ts)?(?=\s|$)(?:\s+([a-z]+))?/.exec(command);
  if (match === null) {
    return undefined;
  }
  const subcommand = match[1] ?? 'serve';
  return subcommand === 'mcp' ? 'another `code-index mcp`' : `\`code-index ${subcommand}\``;
};

const describeHolder = (holder: Holder): string => {
  const what = role(holder.command);
  return `pid ${holder.pid} (${what === undefined ? holder.command || 'unknown command' : `${what}: ${holder.command}`})`;
};

/** RocksDB and LevelDB both say "lock" when another process holds the directory. */
const isLockError = (error: Store.StoreError): boolean => /\block\b|LOCK/.test(error.message);

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
            cause: error,
          })
        : isLockError(error)
          ? new Store.StoreError({
              message: `The store at ${dir} is locked by another process whose PID could not be found. ${ADVICE}`,
              cause: error,
            })
          : error,
    ),
  );
