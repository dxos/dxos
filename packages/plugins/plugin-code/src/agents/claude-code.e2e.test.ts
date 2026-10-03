//
// Copyright 2026 DXOS.org
//

import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { type ContentBlock, Message } from '@dxos/types';

import { serve } from '../agent-helper/server.ts';
import * as AcpAgent from './AcpAgent.ts';
import * as Protocol from './Protocol.ts';

//
// Claude Code on this computer, end to end: the real agent helper, Claude Code's ACP adapter and the
// `claude` CLI against the real API, driven by the same turn engine the desktop app runs. Runs only where
// `DX_E2E_CLAUDE=1` is set and `DX_ANTHROPIC_API_KEY` and `claude` are.
//

/** Opt-in: the suite spends API calls and runs a real agent. */
const ENABLED = process.env.DX_E2E_CLAUDE === '1';
const API_KEY = process.env.DX_ANTHROPIC_API_KEY;
/** Small and quick; the tests check the plumbing, not the model. */
const MODEL = process.env.DX_E2E_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
const TURN_TIMEOUT = 4 * 60_000;

/** Version of Claude Code's ACP adapter the desktop app ships (see plugin-claude's `build-agent.ts`). */
const ADAPTER = '@agentclientprotocol/claude-agent-acp@0.85.0';

const which = (name: string): string | undefined => {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
};

const CLAUDE = which('claude');

/**
 * The real adapter, installed once into a temporary cache rather than as a dependency, which would also
 * pull the SDK's native binary that the app omits in favour of the user's `claude`.
 */
const realAdapter = (): string => {
  const cache = join(tmpdir(), 'dx-claude-agent-acp-0.85.0');
  const entry = join(cache, 'node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js');
  if (!existsSync(entry)) {
    execFileSync('npm', ['install', '--silent', '--no-save', '--omit=optional', '--prefix', cache, ADAPTER], {
      stdio: 'inherit',
    });
  }
  return entry;
};

const summarize = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return `text:${block.text}`;
    case 'request':
      return `request:${block.resolution?.optionId ?? block.resolution?.outcome ?? 'open'}`;
    default:
      return block._tag;
  }
};

const transcript = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(Message.Message)).run.pipe(
    Effect.map((messages) => messages.flatMap((message) => message.blocks.map(summarize))),
  );

/** The first request block the turn parks, once it is there. */
const findRequest = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    while (true) {
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      for (const message of messages) {
        for (const block of message.blocks) {
          if (block._tag === 'request' && block.resolution === undefined) {
            return { message, block };
          }
        }
      }
      yield* Effect.sleep('200 millis');
    }
  });

describe.runIf(ENABLED && API_KEY && CLAUDE)('Claude Code on this computer, end to end', () => {
  const TestLayer = Layer.mergeAll(
    TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
    Layer.succeed(Trace.TraceService, { write: () => {} }),
  );

  /**
   * A helper serving the real adapter, and a chat whose turns it runs in a fresh repository. The agent
   * inherits the helper's environment, as `dx-agent` passes on the app's.
   */
  const setup = Effect.fn(function* (mode: string) {
    const root = mkdtempSync(join(tmpdir(), 'claude-code-e2e-'));
    const work = join(root, 'work');
    mkdirSync(work, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: work });
    Object.assign(process.env, {
      ANTHROPIC_API_KEY: API_KEY,
      ANTHROPIC_MODEL: MODEL,
      CLAUDE_CONFIG_DIR: join(root, 'claude'),
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });

    const token = 'e2e'.repeat(12);
    const server = yield* Effect.acquireRelease(
      Effect.promise(() =>
        serve({
          token,
          agents: [
            {
              id: 'claude-code',
              entry: realAdapter(),
              executable: { name: 'claude', versionArgs: ['--version'], env: 'CLAUDE_CODE_EXECUTABLE' },
            },
          ],
          path: [dirname(CLAUDE ?? ''), ...(process.env.PATH ?? '').split(':')],
        }),
      ),
      (server) => Effect.promise(() => server.close()),
    );

    const feed = yield* Database.add(Feed.make());
    const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'claude-code' } }));
    const options = (sessions: AcpAgent.Sessions): AcpAgent.AgentOptions => ({
      id: 'claude-code',
      sessions,
      connect: (cwd) =>
        Effect.succeed(
          createWebSocketStream(Protocol.acpUrl({ port: server.port, agent: 'claude-code', cwd }), {
            protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)],
          }),
        ),
      workspace: () => Effect.succeed(work),
      mode: () => mode,
    });
    return { work, feed, chat, options };
  });

  it.live(
    'acceptEdits: writes a file without asking',
    () =>
      Effect.gen(function* () {
        const { work, feed, chat, options } = yield* setup('acceptEdits');
        const sessions = yield* AcpAgent.Sessions.make();
        yield* AcpAgent.runTurn(
          options(sessions),
          { chat, feed },
          { prompt: 'Create a file named hello.txt containing exactly: hello from e2e. Then reply DONE.' },
        );

        expect(readFileSync(join(work, 'hello.txt'), 'utf8').trim()).toBe('hello from e2e');
        const blocks = yield* transcript(feed);
        expect(blocks.filter((block) => block.startsWith('request:'))).toEqual([]);
        expect(blocks).toContain('toolCall');
        expect(blocks.at(-1)).toBe('stats');
      }).pipe(Effect.scoped, Effect.provide(TestLayer)),
    TURN_TIMEOUT,
  );

  it.live(
    'default mode: an edit waits on the chat, goes ahead once allowed, and the session resumes after a restart',
    () =>
      Effect.gen(function* () {
        const { work, feed, chat, options } = yield* setup('default');
        const sessions = yield* AcpAgent.Sessions.make();
        const turn = yield* AcpAgent.runTurn(
          options(sessions),
          { chat, feed },
          { prompt: 'Create a file named allowed.txt containing exactly: allowed. Then reply DONE.' },
        ).pipe(Effect.forkChild);

        const { message, block } = yield* findRequest(feed).pipe(Effect.timeout('2 minutes'));
        expect(existsSync(join(work, 'allowed.txt'))).toBe(false);
        const allow =
          block._tag === 'request' ? block.options.find((option) => option.kind === 'allow_once') : undefined;
        expect(allow).toBeDefined();
        const answered = yield* AcpAgent.respond(sessions, {
          chat,
          feed,
          message,
          requestId: block._tag === 'request' ? block.requestId : '',
          optionId: allow?.id ?? '',
        });
        expect(answered).toBe(true);
        yield* Fiber.join(turn);
        expect(readFileSync(join(work, 'allowed.txt'), 'utf8').trim()).toBe('allowed');
        expect(yield* transcript(feed)).toContain(`request:${allow?.id}`);

        // A fresh set of sessions is what an app restart leaves: the turn reloads the agent's session by id.
        const sessionId = AcpAgent.sessionIdOf(chat, 'claude-code');
        expect(sessionId).toBeDefined();
        const restarted = yield* AcpAgent.Sessions.make();
        yield* AcpAgent.runTurn(
          options(restarted),
          { chat, feed },
          { prompt: 'What is the name of the file you created earlier? Reply with only the file name.' },
        );
        expect(AcpAgent.sessionIdOf(chat, 'claude-code')).toBe(sessionId);
        const texts = (yield* transcript(feed)).filter((entry) => entry.startsWith('text:'));
        expect(texts.at(-1)).toContain('allowed.txt');
      }).pipe(Effect.scoped, Effect.provide(TestLayer)),
    TURN_TIMEOUT * 2,
  );

  it.live(
    'default mode: a refused edit is not made, and the turn still ends',
    () =>
      Effect.gen(function* () {
        const { work, feed, chat, options } = yield* setup('default');
        const sessions = yield* AcpAgent.Sessions.make();
        const turn = yield* AcpAgent.runTurn(
          options(sessions),
          { chat, feed },
          {
            prompt:
              'Create a file named refused.txt containing: should not exist. If you are not allowed to, reply BLOCKED.',
          },
        ).pipe(Effect.forkChild);

        const { message, block } = yield* findRequest(feed).pipe(Effect.timeout('2 minutes'));
        const reject =
          block._tag === 'request' ? block.options.find((option) => option.kind === 'reject_once') : undefined;
        expect(reject).toBeDefined();
        yield* AcpAgent.respond(sessions, {
          chat,
          feed,
          message,
          requestId: block._tag === 'request' ? block.requestId : '',
          optionId: reject?.id ?? '',
        });
        // The agent may ask again in another way; each further request is refused too.
        const refuseRest = Effect.gen(function* () {
          while (true) {
            const next = yield* findRequest(feed);
            if (next.block._tag === 'request') {
              const option = next.block.options.find((candidate) => candidate.kind === 'reject_once');
              yield* AcpAgent.respond(sessions, {
                chat,
                feed,
                message: next.message,
                requestId: next.block.requestId,
                optionId: option?.id ?? '',
              });
            }
          }
        });
        yield* Effect.raceFirst(Fiber.join(turn), refuseRest);

        expect(existsSync(join(work, 'refused.txt'))).toBe(false);
        expect((yield* transcript(feed)).at(-1)).toBe('stats');
      }).pipe(Effect.scoped, Effect.provide(TestLayer)),
    TURN_TIMEOUT,
  );
});
