//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { type Readable, type Writable } from 'node:stream';

import { EffectEx } from '@dxos/effect';

import { LocalSandboxBackend } from './LocalSandboxBackend.ts';
import { serve } from './server.ts';

/**
 * Tools a desktop app launched from the Finder would otherwise lack: its `PATH` is only the system
 * directories, which leaves out Homebrew and user-installed interpreters.
 */
const DESKTOP_PATH = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];

const MIN_TOKEN_LENGTH = 32;

/**
 * Source trees, `:`-separated, whose build inputs ({@link buildTree}) commands may read although they sit under
 * the user's home — how a dev build lets an agent build against the Composer source tree it came from.
 */
export const ALLOW_READ_ENV = 'DX_SANDBOX_ALLOW_READ';

/**
 * The parts of a source tree a plugin build reads — dependencies, package sources and builds, and the docs —
 * rather than the whole tree, whose root holds `.secrets/`, `.git/` and `.claude/`.
 */
const buildTree = (root: string): string[] => ['node_modules', 'packages', 'docs'].map((dir) => join(root, dir));

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

  const path = [...new Set([...(env.PATH ?? '').split(':').filter(Boolean), ...DESKTOP_PATH])].join(':');
  const allowRead = (env[ALLOW_READ_ENV] ?? '').split(':').filter(Boolean).flatMap(buildTree);
  const backend = new LocalSandboxBackend({ root: env.DX_SANDBOX_ROOT, path, allowRead });
  const server = await serve({ backend, token });
  output.write(`${JSON.stringify({ port: server.port })}\n`);

  // Drain the rest of the input; it only ever ends.
  while (!(await lines.next()).done) {}
  await server.close();
  await EffectEx.runPromise(Effect.ignore(backend.close()));
};
