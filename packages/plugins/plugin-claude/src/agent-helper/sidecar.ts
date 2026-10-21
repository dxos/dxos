//
// Copyright 2026 DXOS.org
//

import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { type Readable, type Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import * as AgentSpec from './AgentSpec.ts';
import { serve } from './server.ts';

/**
 * Tools a desktop app launched from the Finder would otherwise lack: its `PATH` is only the system
 * directories, which leaves out Homebrew and the user's own installs (where `claude` lives).
 */
const desktopPath = (home: string | undefined): string[] => [
  ...(home ? [join(home, '.local/bin'), join(home, '.claude/local')] : []),
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
];

const MIN_TOKEN_LENGTH = 32;

/** Makes the helper run an agent's entry instead of serving. */
export const AGENT_FLAG = '--agent';

/**
 * Runs the agent entry named after {@link AGENT_FLAG}. The compiled helper runs its own entry point
 * whatever its arguments, so it starts agents as itself with this flag rather than as the bun CLI
 * (`BUN_BE_BUN`), a variable every process the agent starts would inherit.
 */
export const runAgent = async (argv: readonly string[]): Promise<void> => {
  const entry = argv[argv.indexOf(AGENT_FLAG) + 1];
  if (!entry) {
    throw new Error(`expected an agent entry after ${AGENT_FLAG}`);
  }
  await import(pathToFileURL(entry).href);
};

export type AgentHelperOptions = {
  input: Readable;
  output: Writable;
  env: Record<string, string | undefined>;
};

/**
 * The agent helper the desktop app runs. The token comes as the first line of `input` rather than an
 * argument, which any user on the machine could read from the process table; the port goes out as
 * one JSON line on `output`. The helper stops when `input` closes, so it never outlives the app.
 *
 * Agents are the directories beside the executable (`DX_AGENT_DIR` overrides), one per plugin that
 * shipped a helper-side entry. Worktrees go in `DX_AGENT_WORKTREES`, which the app points at its data
 * folder.
 */
export const runAgentHelper = async ({ input, output, env }: AgentHelperOptions): Promise<void> => {
  const lines = createInterface({ input })[Symbol.asyncIterator]();
  const first = await lines.next();
  const token = first.done ? '' : first.value.trim();
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(`expected a token of at least ${MIN_TOKEN_LENGTH} characters on the first line of stdin`);
  }

  const agents = await AgentSpec.load(env.DX_AGENT_DIR ?? join(dirname(process.execPath), 'agents'));
  const path = [...new Set([...(env.PATH ?? '').split(':').filter(Boolean), ...desktopPath(env.HOME)])];
  const server = await serve({
    token,
    agents,
    path,
    launch: (entry) => ({ command: process.execPath, args: [AGENT_FLAG, entry] }),
    worktrees: env.DX_AGENT_WORKTREES,
  });
  output.write(`${JSON.stringify({ port: server.port })}\n`);

  // Drain the rest of the input; it only ever ends.
  while (!(await lines.next()).done) {}
  await server.close();
};
