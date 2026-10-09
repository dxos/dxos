//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type * as Chat from '@dxos/assistant/Chat';
import type * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Filter, Obj, type Registry } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import * as ComposerMcp from '@dxos/plugin-code/ComposerMcp';
import { type ContentBlock, Message } from '@dxos/types';

import type * as ClaudeCodeProcess from '../process/ClaudeCodeProcess.ts';

/**
 * The credential the suite spends, from variables of its own: `ANTHROPIC_API_KEY`, or an interactive
 * login, is whatever the developer happens to have, and the run would charge an account nobody chose.
 * A `claude setup-token` token is connected in the chat's space, as a person connects one, so the
 * process lends it to the agent; an API key is handed to the agent directly.
 */
export const OAUTH_TOKEN = process.env.DX_CLAUDE_CODE_OAUTH_TOKEN ?? '';
export const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';
export const HAS_CREDENTIAL = OAUTH_TOKEN.length > 0 || API_KEY.length > 0;

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

/**
 * Removes every `ANTHROPIC_*` and `CLAUDE_*` variable from this test process, whose environment the
 * agent inherits: run from inside a Claude Code session they name that session, which the agent would
 * resume, and they carry the developer's own credentials.
 */
export const isolateEnvironment = () => {
  for (const name of Object.keys(process.env)) {
    if (name.startsWith('ANTHROPIC_') || name.startsWith('CLAUDE_')) {
      delete process.env[name];
    }
  }
};

/**
 * How the process starts the adapter at `entry`. `HOME` is a fresh directory shared by every agent of
 * the run, so the developer's settings and login play no part, and an agent started after another died
 * can still reload its session.
 */
export const adapterCommand = (entry: string): ClaudeCodeProcess.Command => ({
  command: process.execPath,
  args: [entry],
  env: {
    HOME: mkdtempSync(join(tmpdir(), 'claude-code-e2e-home-')),
    // A setup token, when there is one, comes from the space; Claude Code would prefer a key to it.
    ...(OAUTH_TOKEN.length === 0 && { ANTHROPIC_API_KEY: API_KEY }),
    ...(process.env.DX_E2E_MODEL && { ANTHROPIC_MODEL: process.env.DX_E2E_MODEL }),
  },
});

/** Ids of the running processes whose command line names `dir`: the adapter and the Claude Code it starts. */
export const processesUnder = (dir: string): number[] =>
  // `ww`: without it `ps` clips each line to the terminal's width, and a long command line loses the directory.
  execFileSync('ps', ['-eww', '-o', 'pid=,args='], { encoding: 'utf8' })
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

/** Per turn: a real agent with tools is slow, and the reply is all a turn waits on. */
export const TURN_TIMEOUT = 240_000;

/** Sends `prompt` and waits for the turn it starts to end, returning everything the agent said in it. */
export const turn = Effect.fnUntraced(function* (
  session: AgentService.Session,
  prompt: string,
  timeout: number = TURN_TIMEOUT,
) {
  const before = yield* messages(session.feed);
  const seen = new Set(before.map((message) => message.id));
  const ended = before.filter(endsTurn).length;
  yield* session.submitPrompt(prompt);
  let latest = before;
  const after = yield* eventually(
    messages(session.feed).pipe(
      Effect.tap((all) => Effect.sync(() => (latest = all))),
      Effect.map((all) => (all.filter(endsTurn).length > ended ? all : undefined)),
    ),
    () => `the turn did not end: ${prompt}\nthe chat ends with:\n${summarize(latest.slice(-5))}`,
    timeout,
  );
  return after
    .filter((message) => message.sender.role === 'assistant' && !seen.has(message.id))
    .map((message) => Message.extractText(message))
    .filter((text) => text.length > 0)
    .join('\n');
});

export const messages = Effect.fnUntraced(function* (feed: Feed.Feed) {
  return (yield* Feed.query(feed, Filter.type(Message.Message)).run).filter(Obj.instanceOf(Message.Message));
});

/** One line per message, naming its blocks, so a turn that stalls says where. */
const summarize = (tail: readonly Message.Message[]): string =>
  tail
    .map(
      (message) =>
        `${message.sender.role}: ${message.blocks.map((block) => block._tag).join(', ')} ${Message.extractText(message).slice(0, 200)}`,
    )
    .join('\n');

/** An ACP turn closes with its usage, so a stats block marks a turn that ended rather than one still talking. */
const endsTurn = (message: Message.Message): boolean => message.blocks.some((block) => block._tag === 'stats');

/** The assistant's text, in the order the turns produced it. */
export const transcript = Effect.fnUntraced(function* (feed: Feed.Feed) {
  return (yield* messages(feed))
    .filter((message) => message.sender.role === 'assistant')
    .map((message) => Message.extractText(message))
    .filter((text) => text.length > 0);
});
