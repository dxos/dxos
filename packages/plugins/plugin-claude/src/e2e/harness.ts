//
// Copyright 2026 DXOS.org
//

import * as acp from '@agentclientprotocol/sdk';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';

import type * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Filter, Obj, type Registry } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import * as ComposerMcp from '@dxos/plugin-code/ComposerMcp';
import { type ContentBlock, Message } from '@dxos/types';

/**
 * The credential the suite spends. Deliberately not `ANTHROPIC_API_KEY`: that, or an interactive
 * login, is whatever the developer happens to have, and the run would charge an account nobody chose.
 */
export const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';

/** The ACP adapter release under test; pinned so a failure is a change here, not upstream. */
export const ADAPTER_VERSION = process.env.DX_E2E_CLAUDE_ACP_VERSION ?? '0.86.0';

const ADAPTER_PACKAGE = '@agentclientprotocol/claude-agent-acp';

/** Installs the adapter into a directory of its own, which also lets the suite find every process it starts. */
export const installAdapter = (): { dir: string; entry: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-code-e2e-adapter-'));
  execFileSync(
    'npm',
    ['install', '--prefix', dir, '--no-audit', '--no-fund', `${ADAPTER_PACKAGE}@${ADAPTER_VERSION}`],
    {
      stdio: 'ignore',
    },
  );
  const root = join(dir, 'node_modules', ADAPTER_PACKAGE);
  const { bin } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return { dir, entry: join(root, typeof bin === 'string' ? bin : bin['claude-agent-acp']) };
};

export type Adapter = {
  /** Starts the adapter in `cwd` and returns its ACP stream, as the desktop app's agent helper does. */
  readonly connect: AcpAgent.AgentOptions['connect'];
  /** Kills every adapter this one started that is still running. */
  readonly stop: () => void;
};

/**
 * Starts the adapter at `entry` the way the desktop app's agent helper does, with Composer's tools
 * token in its environment. It runs through `env`, so every `CLAUDE_*` variable is removed rather
 * than inherited: run from inside another Claude Code session they name that session, and the agent
 * would resume its conversation. `HOME` is a fresh directory shared by every agent this one starts,
 * so the developer's settings and login play no part, the API key is the only credential, and an
 * agent started after another died can still reload its session.
 */
export const makeAdapter = (entry: string): Adapter => {
  const home = mkdtempSync(join(tmpdir(), 'claude-code-e2e-home-'));
  const children: ChildProcess[] = [];
  const inherited = Object.fromEntries(
    Object.entries(process.env).flatMap(([name, value]) => (value === undefined ? [] : [[name, value]])),
  );
  return {
    connect: (cwd, toolsToken) =>
      Effect.sync(() => {
        const child = spawn(
          'env',
          [
            ...Object.keys(process.env)
              .filter((name) => name.startsWith('CLAUDE_'))
              .flatMap((name) => ['-u', name]),
            process.execPath,
            entry,
          ],
          {
            cwd,
            env: {
              ...inherited,
              ANTHROPIC_API_KEY: API_KEY,
              HOME: home,
              ...(process.env.DX_E2E_MODEL && { ANTHROPIC_MODEL: process.env.DX_E2E_MODEL }),
              ...(toolsToken !== undefined && { [AcpAgent.TOOLS_TOKEN_ENV]: toolsToken }),
            },
            stdio: ['pipe', 'pipe', 'ignore'],
          },
        );
        children.push(child);
        // A write to an agent that died is refused by the stream; unlistened, the pipe's error would crash the run.
        child.stdin.on('error', (error) => log('adapter stdin closed', { error: error.message }));
        return acp.ndJsonStream(Writable.toWeb(child.stdin), bytes(child.stdout));
      }),
    stop: () => {
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }
    },
  };
};

/** A Node stream as the byte stream ACP reads; a reader that cancelled closed it, so later events leave it alone. */
const bytes = (stream: Readable): ReadableStream<Uint8Array> => {
  let open = true;
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      stream.on('data', (chunk: Buffer) => open && controller.enqueue(new Uint8Array(chunk)));
      stream.once('end', () => {
        if (open) {
          open = false;
          controller.close();
        }
      });
      stream.once('error', (error) => {
        if (open) {
          open = false;
          controller.error(error);
        }
      });
    },
    cancel: () => {
      open = false;
      stream.destroy();
    },
  });
};

/** Ids of the running processes whose command line names `dir`: the adapter and the Claude Code it starts. */
export const processesUnder = (dir: string): number[] =>
  execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' })
    .split('\n')
    .flatMap((line) => {
      const match = /^\s*(\d+)\s+(.*)$/.exec(line);
      return match && match[2].includes(dir) ? [Number(match[1])] : [];
    });

/** Polls until `check` yields a value, dying with `message` once `timeout` milliseconds pass. */
export const eventually = <A, R>(
  check: Effect.Effect<A | undefined | false, never, R>,
  message: () => string,
  timeout = 30_000,
): Effect.Effect<A, never, R> =>
  Effect.gen(function* () {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = yield* check;
      if (value !== undefined && value !== false) {
        return value;
      }
      yield* Effect.sleep('250 millis');
    }
    return yield* Effect.die(new Error(message()));
  });

export type McpCall = { method: string; tool?: string; operation?: string };

export type ComposerHost = {
  /** What the agent asked of the server, in order. */
  readonly calls: McpCall[];
  /** Requests turned away for presenting the wrong token, or none. */
  readonly rejected: () => number;
  readonly tools: NonNullable<AcpAgent.AgentOptions['tools']>;
};

/**
 * Serves Composer's MCP surface ({@link ComposerMcp.handler}) on a loopback port, over the test's own
 * registry and operation invoker, the way `CodeAgent` serves it to an agent in the app. The desktop
 * app relays these requests through its agent helper, which this host stands in for: it checks the
 * bearer token the agent presents, which the agent reads from its environment.
 */
export const serveComposerMcp = ({
  registry,
}: {
  registry: Registry.Registry;
}): Effect.Effect<
  ComposerHost,
  never,
  Scope.Scope | Database.Service | Operation.Service | OperationHandlerSet.OperationHandlerProvider
> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const context = yield* Effect.context<Database.Service | Operation.Service>();
    const token = randomBytes(32).toString('hex');
    const calls: McpCall[] = [];
    let rejected = 0;

    const mcp = ComposerMcp.handler({
      registry,
      host: ComposerMcp.host({
        handlers: handlerSet.handlers,
        invoke: (operation, input) => Operation.invoke(operation, input).pipe(Effect.provide(context), Effect.orDie),
        spaceIds: [db.spaceId],
        database: (spaceId) => (spaceId === db.spaceId ? db : undefined),
      }),
      path: '/mcp',
    });

    const serve = async (request: IncomingMessage, response: ServerResponse) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf8');
      if (request.headers.authorization !== `Bearer ${token}`) {
        rejected++;
        response.writeHead(401).end();
        return;
      }
      record(calls, body);
      const answer = await mcp.handle(
        new Request(`http://127.0.0.1${request.url}`, {
          method: request.method,
          headers: Object.entries(request.headers).flatMap(([name, value]) =>
            typeof value === 'string' ? [[name, value] as [string, string]] : [],
          ),
          body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
        }),
      );
      response.writeHead(answer.status, Object.fromEntries(answer.headers.entries()));
      response.end(await answer.text());
    };

    const server = createServer((request, response) => {
      void serve(request, response).catch(() => response.writeHead(500).end());
    });
    const port = yield* Effect.acquireRelease(
      Effect.callback<number>((resume) => {
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          resume(Effect.succeed(typeof address === 'object' && address ? address.port : 0));
        });
      }),
      () =>
        Effect.promise(async () => {
          server.closeAllConnections();
          await new Promise((resolve) => server.close(resolve));
          await mcp.dispose();
        }),
    );

    return {
      calls,
      rejected: () => rejected,
      tools: () =>
        Effect.succeed({
          token,
          servers: [
            {
              type: 'http' as const,
              name: ComposerMcp.SERVER_NAME,
              url: `http://127.0.0.1:${port}/mcp`,
              // As in the app: the header names the variable, and the agent expands it from its environment.
              headers: [{ name: 'Authorization', value: `Bearer \${${AcpAgent.TOOLS_TOKEN_ENV}}` }],
            },
          ],
        }),
    };
  });

/** Records each JSON-RPC request in `body`, naming the tool and, for `invokeOperation`, the operation. */
const record = (calls: McpCall[], body: string) => {
  const parsed = (() => {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  })();
  for (const message of Array.isArray(parsed) ? parsed : parsed ? [parsed] : []) {
    if (typeof message?.method !== 'string') {
      continue;
    }
    const tool = typeof message.params?.name === 'string' ? message.params.name : undefined;
    const operation = typeof message.params?.arguments?.key === 'string' ? message.params.arguments.key : undefined;
    calls.push({ method: message.method, tool, operation });
  }
};

export type Decision = 'allow' | 'reject';

/** A permission the agent asked for, and how the suite answered it. */
export type Asked = { title: string; decision: Decision };

/**
 * Answers the agent's permission requests as a person in the chat would, through
 * {@link AcpAgent.respond}, with `decide`'s verdict. Runs until the scope closes.
 */
export const answerPermissions = ({
  chat,
  feed,
  sessions,
  decide,
}: {
  chat: Chat.Chat;
  feed: Feed.Feed;
  sessions: AcpAgent.Sessions;
  decide: (title: string) => Decision;
}): Effect.Effect<Asked[], never, Scope.Scope | Database.Service> =>
  Effect.gen(function* () {
    const asked: Asked[] = [];
    const answered = new Set<string>();
    const sweep = Effect.gen(function* () {
      const messages = (yield* Feed.query(feed, Filter.type(Message.Message)).run).filter(
        Obj.instanceOf(Message.Message),
      );
      for (const message of messages) {
        for (const block of message.blocks) {
          if (block._tag !== 'request' || block.resolution !== undefined || answered.has(block.requestId)) {
            continue;
          }
          answered.add(block.requestId);
          const decision = decide(block.title);
          const option = pick(block, decision);
          asked.push({ title: block.title, decision });
          yield* AcpAgent.respond(sessions, {
            chat,
            feed,
            message,
            requestId: block.requestId,
            optionId: option?.id ?? '',
          });
        }
      }
    });
    yield* sweep.pipe(
      Effect.andThen(Effect.sleep('200 millis')),
      Effect.forever,
      // A sweep that dies leaves requests unanswered, so the turn waiting on one times out; this says why.
      Effect.tapCause((cause) => Effect.sync(() => log.error('permission sweep failed', { cause }))),
      Effect.forkScoped,
    );
    return asked;
  });

const pick = (block: ContentBlock.Request, decision: Decision) =>
  block.options.find((option) => option.kind === `${decision}_once`) ??
  block.options.find((option) => option.kind?.startsWith(decision));
