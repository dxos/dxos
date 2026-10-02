//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { type ChildProcessWithoutNullStreams, execFile, spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { isAbsolute, join } from 'node:path';
import { createInterface } from 'node:readline';
import { type WebSocket, WebSocketServer } from 'ws';

import { log } from '@dxos/log';

import * as Protocol from '../agents/Protocol.ts';
import type * as AgentSpec from './AgentSpec.ts';
import * as Worktrees from './Worktrees.ts';

const PROBE_TIMEOUT_MS = 10_000;

export type ServeOptions = {
  /** Required of every request: the only thing between another local process and an agent that runs shell. */
  token: string;
  agents: readonly AgentSpec.AgentSpec[];
  /** Directories searched for each agent's command-line tool. */
  path: readonly string[];
  /** Port to listen on; 0 picks a free one. */
  port?: number;
  /** How an agent's entry is started; by default the running runtime executes it directly. */
  launch?: Launch;
  /** Directory the worktrees live in; without one, worktree requests are refused. */
  worktrees?: string;
};

/** The program and arguments that run an agent's entry. */
export type Launch = (entry: string) => { command: string; args: string[] };

const runEntry: Launch = (entry) => ({ command: process.execPath, args: [entry] });

export type AgentServer = {
  readonly port: number;
  close(): Promise<void>;
};

/**
 * Serves the agents on the loopback interface. `GET /agents` reports which can run; a WebSocket on
 * `/acp?agent=…&cwd=…` starts one agent process in that directory and relays its ACP traffic, one
 * JSON-RPC message per frame each way. The agent dies with its socket.
 *
 * This is how the Tauri webview, which cannot spawn processes, runs a coding agent: it holds the ACP
 * client and this helper only moves bytes.
 */
export const serve = async ({
  token,
  agents,
  path,
  port = 0,
  launch = runEntry,
  worktrees,
}: ServeOptions): Promise<AgentServer> => {
  const children = new Set<ChildProcessWithoutNullStreams>();
  const sockets = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => (protocols.has(Protocol.SUBPROTOCOL) ? Protocol.SUBPROTOCOL : false),
  });

  const server = createServer((request, response) => {
    void handleRequest({ request, response, token, agents, path, worktrees }).catch((error) => {
      log.catch(error);
      send(response, 500, { error: 'internal error' });
    });
  });

  server.on('upgrade', (request, socket, head) => {
    void authorizeUpgrade({ request, token, agents, path }).then(
      (target) => {
        if (typeof target === 'number') {
          socket.end(`HTTP/1.1 ${target} ${target === 401 ? 'Unauthorized' : 'Forbidden'}\r\n\r\n`);
          return;
        }
        sockets.handleUpgrade(request, socket, head, (ws) => {
          const child = relay({ ws, path, launch, ...target });
          children.add(child);
          child.once('exit', () => children.delete(child));
        });
      },
      (error) => {
        log.catch(error);
        socket.destroy();
      },
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('agent helper is not listening on a TCP port');
  }

  return {
    port: address.port,
    close: async () => {
      for (const child of children) {
        child.kill();
      }
      sockets.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};

/** Reports whether an agent's command-line tool is installed and which version it is. */
export const probe = async (spec: AgentSpec.AgentSpec, path: readonly string[]): Promise<Protocol.AgentStatus> => {
  const tool = spec.executable;
  if (!tool) {
    return { id: spec.id, available: true };
  }
  const executable = await which(tool.name, path);
  if (!executable) {
    return { id: spec.id, available: false, reason: `${tool.name} is not installed` };
  }
  const output = await new Promise<string | undefined>((resolve) => {
    execFile(executable, [...tool.versionArgs], { timeout: PROBE_TIMEOUT_MS }, (error, stdout) =>
      resolve(error ? undefined : stdout.trim().split('\n')[0]),
    );
  });
  return output === undefined
    ? { id: spec.id, available: false, reason: `${tool.name} did not report a version` }
    : { id: spec.id, available: true, version: output };
};

/** Finds an executable on `path`, which is what a shell would run for `name`. */
export const which = async (name: string, path: readonly string[]): Promise<string | undefined> => {
  for (const dir of path) {
    const candidate = join(dir, name);
    if (
      await access(candidate, constants.X_OK).then(
        () => true,
        () => false,
      )
    ) {
      return candidate;
    }
  }
  return undefined;
};

type RequestContext = {
  request: IncomingMessage;
  response: ServerResponse;
  token: string;
  agents: readonly AgentSpec.AgentSpec[];
  path: readonly string[];
  worktrees?: string;
};

/** Largest request body the helper reads; a worktree request is a few hundred bytes. */
const MAX_BODY_BYTES = 64 * 1024;

const handleRequest = async ({ request, response, token, agents, path, worktrees }: RequestContext): Promise<void> => {
  // Any origin may ask; only a holder of the token gets an answer.
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin ?? '*');
  response.setHeader(
    'Access-Control-Allow-Headers',
    request.headers['access-control-request-headers'] ?? 'authorization',
  );
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  if (request.method === 'OPTIONS') {
    send(response, 204);
    return;
  }
  if (!isLoopbackHost(request)) {
    send(response, 403, { error: 'forbidden host' });
    return;
  }
  if (!matches(request.headers.authorization ?? '', `Bearer ${token}`)) {
    send(response, 401, { error: 'unauthorized' });
    return;
  }
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === Protocol.AGENTS_PATH) {
    send(response, 200, await Promise.all(agents.map((spec) => probe(spec, path))));
    return;
  }
  if (url.pathname === Protocol.WORKTREES_PATH) {
    if (!worktrees) {
      send(response, 503, { error: 'worktrees are not available' });
      return;
    }
    await handleWorktrees({ request, response, url, context: { root: worktrees, path } });
    return;
  }
  send(response, 404, { error: 'not found' });
};

const handleWorktrees = async ({
  request,
  response,
  url,
  context,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  context: Worktrees.Context;
}): Promise<void> => {
  try {
    switch (request.method) {
      case 'GET':
        send(response, 200, await Worktrees.list(context));
        return;
      case 'POST': {
        const body = Schema.decodeUnknownOption(Protocol.WorktreeRequest)(await readJson(request));
        if (Option.isNone(body)) {
          send(response, 400, { error: 'invalid worktree request' });
          return;
        }
        send(response, 200, await Worktrees.ensure(context, body.value));
        return;
      }
      case 'DELETE':
        send(response, 200, { outcome: await Worktrees.remove(context, url.searchParams.get('key') ?? '') });
        return;
      default:
        send(response, 405, { error: 'method not allowed' });
    }
  } catch (error) {
    if (error instanceof Worktrees.WorktreeError) {
      send(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

/** The request's JSON body, or undefined when it is too large or not JSON. */
const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      return undefined;
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
};

type UpgradeTarget = {
  spec: AgentSpec.AgentSpec;
  cwd: string;
  /** The agent's command-line tool on this machine, when the agent names one. */
  executable?: string;
};

/** Decides an upgrade: the target to run, or the HTTP status to refuse it with. */
const authorizeUpgrade = async ({
  request,
  token,
  agents,
  path,
}: {
  request: IncomingMessage;
  token: string;
  agents: readonly AgentSpec.AgentSpec[];
  path: readonly string[];
}): Promise<UpgradeTarget | number> => {
  if (!isLoopbackHost(request) || !isLocalOrigin(request.headers.origin)) {
    return 403;
  }
  const offered = (request.headers['sec-websocket-protocol'] ?? '').split(',').map((protocol) => protocol.trim());
  if (!matches(Protocol.tokenFromProtocols(offered) ?? '', token)) {
    return 401;
  }
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const spec = agents.find((agent) => agent.id === url.searchParams.get('agent'));
  const cwd = url.searchParams.get('cwd') ?? '';
  if (url.pathname !== Protocol.ACP_PATH || !spec || !isAbsolute(cwd)) {
    return 403;
  }
  const isDirectory = await stat(cwd).then(
    (info) => info.isDirectory(),
    () => false,
  );
  if (!isDirectory) {
    return 403;
  }
  const executable = spec.executable ? await which(spec.executable.name, path) : undefined;
  return { spec, cwd, executable };
};

/** Starts the agent and pipes it to the socket; whichever side closes first takes the other down. */
const relay = ({
  ws,
  spec,
  cwd,
  executable,
  path,
  launch,
}: UpgradeTarget & { ws: WebSocket; path: readonly string[]; launch: Launch }): ChildProcessWithoutNullStreams => {
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: path.join(':') };
  if (spec.executable?.env && executable) {
    env[spec.executable.env] = executable;
  }
  const { command, args } = launch(spec.entry);
  const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });

  // Each failure ends this agent's socket only; an unhandled one would take every other agent down too.
  child.on('error', (error) => {
    log.warn('agent process failed', { agent: spec.id, error });
    if (ws.readyState === ws.OPEN) {
      ws.close(1011, 'agent failed to start');
    }
  });
  child.stdin.on('error', (error) => log.warn('agent input closed', { agent: spec.id, error }));
  ws.on('error', (error) => {
    log.warn('agent socket failed', { agent: spec.id, error });
    child.kill();
  });

  createInterface({ input: child.stdout }).on('line', (line) => {
    if (line.trim() && ws.readyState === ws.OPEN) {
      ws.send(line);
    }
  });
  child.stderr.on('data', (chunk) => process.stderr.write(`[${spec.id}] ${chunk}`));
  ws.on('message', (data) => {
    if (child.stdin.writable) {
      child.stdin.write(`${data.toString()}\n`);
    }
  });
  ws.on('close', () => child.kill());
  child.on('exit', (code) => {
    if (ws.readyState === ws.OPEN) {
      ws.close(code === 0 ? 1000 : 1011, `agent exited with ${code}`);
    }
  });
  return child;
};

const matches = (actual: string, expected: string): boolean => {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** Any other name is a page that rebound its own DNS onto this port. */
const isLoopbackHost = (request: IncomingMessage): boolean =>
  /^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host ?? '');

/** A loopback web origin, or the webview's own scheme; an absent `Origin` is a non-browser client. */
const isLocalOrigin = (origin: string | undefined): boolean =>
  origin === undefined || /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|tauri:\/\/localhost)$/.test(origin);

const send = (response: ServerResponse, status: number, body?: unknown): void => {
  response.statusCode = status;
  if (body !== undefined) {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  } else {
    response.end();
  }
};
