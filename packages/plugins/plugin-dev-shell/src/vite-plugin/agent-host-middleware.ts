//
// Copyright 2026 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

import { log } from '@dxos/log';

import { Shell } from '#shell';

import { fail, hostOf, isLoopback } from './shell-middleware.ts';

// Raw promises: like the shell route, this is the node platform boundary inside a dev-server request handler.

export type MakeOptions = {
  /** Directory of agent directories (`agent.json` each); defaults to the agents plugin-claude builds. */
  agents?: string;
  /** Where delegated chats get their git worktrees. */
  worktrees?: string;
  /** Route to answer on; defaults to {@link Shell.AGENT_HOST_PATH}. */
  path?: string;
  /** Where agents work when a chat's project names no folder; defaults to the checkout this dev server runs in. */
  folder?: string;
  /** Command that runs an agent's entry script; defaults to bun, which the bundled agents are built for. */
  runtime?: string;
};

type Endpoint = { port: number; token: string };

/** How long the agent server may take to report its port. */
const START_TIMEOUT_MS = 15_000;

/** How long the agent server may take to stop once its input ends. */
const CLOSE_TIMEOUT_MS = 5_000;

/**
 * Runs plugin-claude's agent server (`AgentSidecar.runAgentHelper`, the desktop app's sidecar) in a Node process of its
 * own, launching each agent's entry with `DX_AGENT_RUNTIME`.
 */
const SERVER_PROGRAM = `
const { AgentSidecar } = await import(process.env.DX_AGENT_HOST_MODULE);
await AgentSidecar.runAgentHelper({
  input: process.stdin,
  output: process.stdout,
  env: process.env,
  launch: (entry) => ({ command: process.env.DX_AGENT_RUNTIME, args: [entry] }),
});
`;

/**
 * Starts plugin-claude's agent server for a dev server and answers the page with where it listens; the page then talks
 * to that server directly, as the desktop app's webview talks to its `dx-agent` sidecar.
 *
 * The server runs in a process of its own, started by `prepare` while the dev server is young: on macOS `posix_spawn`
 * refuses descriptors at or above `OPEN_MAX` (10240), and a dev server watching the monorepo holds more than that, so
 * nothing it spawns later starts (`spawn EBADF`).
 *
 * The answer carries the server's token, which starts processes as the developer, so the route admits only the page
 * the developer opened: a loopback peer, a JSON request (a cross-origin page cannot send one without a preflight this
 * route never answers), and a same-origin `Origin`.
 */
export const make = ({
  agents = defaultAgentsDir(),
  worktrees = join(tmpdir(), 'dx-agent-worktrees'),
  path = Shell.AGENT_HOST_PATH,
  folder = checkoutOf(process.cwd()),
  runtime = 'bun',
}: MakeOptions = {}) => {
  let child: ChildProcessWithoutNullStreams | undefined;
  let running: Promise<Endpoint> | undefined;

  const start = (): Promise<Endpoint> =>
    new Promise<Endpoint>((resolve, reject) => {
      const token = randomBytes(32).toString('hex');
      let server: ChildProcessWithoutNullStreams;
      try {
        server = spawn(process.execPath, ['--input-type=module', '-e', SERVER_PROGRAM], {
          env: {
            ...process.env,
            DX_AGENT_HOST_MODULE: import.meta.resolve('@dxos/plugin-claude/vite-plugin'),
            DX_AGENT_DIR: agents,
            DX_AGENT_WORKTREES: worktrees,
            DX_AGENT_RUNTIME: runtime,
            PATH: searchPath(process.env.PATH, homedir()).join(':'),
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        reject(new Error(`the dev server can no longer start processes (${String(error)}); restart it`));
        return;
      }
      child = server;
      const timer = setTimeout(
        () => reject(new Error('the agent server did not report a port in time')),
        START_TIMEOUT_MS,
      );
      createInterface({ input: server.stdout }).once('line', (line) => {
        clearTimeout(timer);
        try {
          const { port } = JSON.parse(line);
          log.info('agent host running', { pid: server.pid, port, agents });
          resolve({ port, token });
        } catch (error) {
          reject(new Error(`unexpected first line from the agent server: ${line} (${String(error)})`));
        }
      });
      server.stderr.on('data', (chunk) => log.info('agent host', { output: String(chunk).trim() }));
      server.on('error', (error) => reject(error));
      server.on('exit', (code, signal) => {
        clearTimeout(timer);
        if (child === server) {
          child = undefined;
          running = undefined;
        }
        reject(new Error(`the agent server exited (code ${code}, signal ${signal})`));
      });
      // The server reads its token from the first line of input and stops when input ends, so it never outlives this.
      server.stdin.write(`${token}\n`);
    });

  const endpoint = (): Promise<Endpoint> =>
    (running ??= start().catch((error) => {
      running = undefined;
      throw error;
    }));

  /** Starts the server now, while this process can still spawn; otherwise the first request starts it. */
  const prepare = (): void => {
    endpoint().catch((error) => log.warn('agent host failed to start', { error }));
  };

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    if (req.method !== 'POST' || !req.url?.startsWith(path)) {
      return next();
    }
    if (!isLoopback(req.socket.remoteAddress)) {
      return fail(res, 403, 'agent host requests are accepted from this machine only');
    }
    if (!req.headers['content-type']?.includes('application/json')) {
      return fail(res, 415, 'content-type must be application/json');
    }
    const origin = req.headers.origin;
    if (origin && hostOf(origin) !== req.headers.host) {
      return fail(res, 403, 'cross-origin request');
    }

    try {
      const { port, token } = await endpoint();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ port, token, folder }));
    } catch (error) {
      fail(res, 500, `agent host failed to start: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /** Stops the server: it closes once its input ends, so this resolves when the process has exited. */
  const close = async (): Promise<void> => {
    const server = child;
    running = undefined;
    child = undefined;
    if (!server || server.exitCode !== null || server.signalCode !== null) {
      return;
    }
    const exited = new Promise<void>((resolve) => server.once('exit', () => resolve()));
    server.stdin.end();
    // Open connections hold the server's close; past the grace period it is stopped outright.
    const timer = setTimeout(() => server.kill(), CLOSE_TIMEOUT_MS);
    await exited;
    clearTimeout(timer);
  };

  return { prepare, middleware, close };
};

/** The nearest directory holding `.git` (a checkout, or a worktree's `.git` file), or `dir` itself outside one. */
const checkoutOf = (dir: string): string => {
  for (let current = dir; ; current = dirname(current)) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    if (dirname(current) === current) {
      return dir;
    }
  }
};

/** The agents plugin-claude's `compile-agent` task writes beside its package. */
const defaultAgentsDir = (): string =>
  join(dirname(createRequire(import.meta.url).resolve('@dxos/plugin-claude/package.json')), 'dist', 'agent');

/** The dev server's `PATH`, plus where the `claude` installer puts the tool when a shell profile does not. */
const searchPath = (path: string | undefined, home: string): string[] => [
  ...new Set([...(path ?? '').split(':').filter(Boolean), join(home, '.local/bin'), join(home, '.claude/local')]),
];
