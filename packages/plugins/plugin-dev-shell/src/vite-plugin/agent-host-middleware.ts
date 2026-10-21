//
// Copyright 2026 DXOS.org
//

import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

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
};

type Running = { port: number; token: string; close: () => Promise<void> };

/**
 * Connect-style middleware that starts plugin-claude's agent server inside the dev server on first request and
 * answers with where it listens. The page then talks to that server directly, as the desktop app's webview talks to
 * its `dx-agent` sidecar.
 *
 * The answer carries the server's token, which starts processes as the developer, so the route admits only the page
 * the developer opened: a loopback peer, a JSON request (a cross-origin page cannot send one without a preflight this
 * route never answers), and a same-origin `Origin`.
 */
export const make = ({
  agents = defaultAgentsDir(),
  worktrees = join(tmpdir(), 'dx-agent-worktrees'),
  path = Shell.AGENT_HOST_PATH,
}: MakeOptions = {}) => {
  let running: Promise<Running> | undefined;

  const start = async (): Promise<Running> => {
    // Loaded on first use: the agent server pulls in its WebSocket and MCP dependencies, which a dev server that
    // never runs an agent should not pay for.
    const { AgentServer, AgentSpec } = await import('@dxos/plugin-claude/vite-plugin');
    const token = randomBytes(32).toString('hex');
    const specs = await AgentSpec.load(agents);
    if (specs.length === 0) {
      log.warn('no coding agents found; run `moon run plugin-claude:compile-agent`', { agents });
    }
    const server = await AgentServer.serve({
      token,
      agents: specs,
      path: searchPath(process.env.PATH, homedir()),
      // Agents are bundled for bun, which the repository's toolchain provides.
      launch: (entry) => ({ command: 'bun', args: [entry] }),
      worktrees,
    });
    log.info('agent host running', { port: server.port, agents: specs.map(({ id }) => id) });
    return { port: server.port, token, close: () => server.close() };
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
      running ??= start().catch((error) => {
        running = undefined;
        throw error;
      });
      const { port, token } = await running;
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ port, token }));
    } catch (error) {
      log.warn('agent host failed to start', { error });
      fail(res, 500, `agent host failed to start: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const close = async (): Promise<void> => {
    const current = running;
    running = undefined;
    await (await current?.catch(() => undefined))?.close();
  };

  return { middleware, close };
};

/** The agents plugin-claude's `compile-agent` task writes beside its package. */
const defaultAgentsDir = (): string =>
  join(dirname(createRequire(import.meta.url).resolve('@dxos/plugin-claude/package.json')), 'dist', 'agent');

/** The dev server's `PATH`, plus where the `claude` installer puts the tool when a shell profile does not. */
const searchPath = (path: string | undefined, home: string): string[] => [
  ...new Set([...(path ?? '').split(':').filter(Boolean), join(home, '.local/bin'), join(home, '.claude/local')]),
];
