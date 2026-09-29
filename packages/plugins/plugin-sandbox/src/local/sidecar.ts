//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { type Readable, type Writable } from 'node:stream';

import { EffectEx } from '@dxos/effect';

import { LocalSandboxBackend, defaultSandboxRoot } from './LocalSandboxBackend.ts';
import { serve } from './server.ts';

/**
 * Tools a desktop app launched from the Finder would otherwise lack: its `PATH` is only the system
 * directories, which leaves out Homebrew and user-installed interpreters.
 */
const DESKTOP_PATH = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];

const MIN_TOKEN_LENGTH = 32;

/**
 * Puts the bun runtime the helper was compiled with on the commands' `PATH` as `bun` and `bunx`, so a
 * sandbox can install and build JavaScript on a machine with no node or bun of its own. `BUN_BE_BUN`
 * makes a `bun build --compile` executable behave as the bun CLI instead of running its entrypoint.
 * Returns the directory to prepend to `PATH`, or `undefined` when the helper is not running on bun.
 */
const provideBundledBun = async (dir: string, execPath: string): Promise<string | undefined> => {
  if (!process.versions.bun) {
    return undefined;
  }

  const quoted = `'${execPath.replaceAll("'", `'\\''`)}'`;
  await mkdir(dir, { recursive: true });
  for (const [name, args] of [
    ['bun', '"$@"'],
    ['bunx', 'x "$@"'],
  ]) {
    const file = join(dir, name);
    await writeFile(file, `#!/bin/sh\nBUN_BE_BUN=1 exec ${quoted} ${args}\n`);
    await chmod(file, 0o755);
  }
  return dir;
};

export type SidecarOptions = {
  input: Readable;
  output: Writable;
  env: Record<string, string | undefined>;
};

/**
 * The local sandbox helper the desktop app runs. The token comes as the first line of `input`
 * rather than an argument, which any user on the machine could read from the process table; the
 * port goes out as one JSON line on `output`. The helper stops when `input` closes, so it never
 * outlives the app that started it.
 */
export const runSidecar = async ({ input, output, env }: SidecarOptions): Promise<void> => {
  const lines = createInterface({ input })[Symbol.asyncIterator]();
  const first = await lines.next();
  const token = first.done ? '' : first.value.trim();
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(`expected a token of at least ${MIN_TOKEN_LENGTH} characters on the first line of stdin`);
  }

  const root = env.DX_SANDBOX_ROOT ?? defaultSandboxRoot();
  const bunDir = await provideBundledBun(join(dirname(root), 'sandbox-bin'), process.execPath);
  const path = [
    ...new Set([...(bunDir ? [bunDir] : []), ...(env.PATH ?? '').split(':').filter(Boolean), ...DESKTOP_PATH]),
  ].join(':');
  // The wrappers sit beside the sandboxes, under the home directory the sandbox cannot otherwise read.
  const allowRead = bunDir ? [bunDir, process.execPath] : [];
  const backend = new LocalSandboxBackend({ root, path, allowRead });
  const server = await serve({ backend, token });
  output.write(`${JSON.stringify({ port: server.port })}\n`);

  // Drain the rest of the input; it only ever ends.
  while (!(await lines.next()).done) {}
  await server.close();
  await EffectEx.runPromise(Effect.ignore(backend.close()));
};
