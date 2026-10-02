//
// Copyright 2026 DXOS.org
//

import type * as acp from '@agentclientprotocol/sdk';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';

import { Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { type ContentBlock, Message } from '@dxos/types';

import * as AcpAgent from './AcpAgent.ts';
import { makeFakeAgent } from './testing/fake-agent.ts';

/** A fresh in-memory "process" of `app`: sessions it hosted before survive, as on an agent's disk. */
const inMemory = (app: acp.AgentApp): acp.Stream => {
  const toAgent = new TransformStream<acp.AnyMessage>();
  const toClient = new TransformStream<acp.AnyMessage>();
  app.connect({ readable: toAgent.readable, writable: toClient.writable });
  return { readable: toClient.readable, writable: toAgent.writable };
};

type Written = { key: string; payload: unknown };

const streamedId = (payload: unknown): string | undefined =>
  typeof payload === 'object' && payload !== null && 'messageId' in payload && typeof payload.messageId === 'string'
    ? payload.messageId
    : undefined;

const streamedText = (payload: unknown): string | undefined =>
  typeof payload === 'object' &&
  payload !== null &&
  'block' in payload &&
  typeof payload.block === 'object' &&
  payload.block !== null &&
  'text' in payload.block &&
  typeof payload.block.text === 'string'
    ? payload.block.text
    : undefined;

const setup = Effect.fn(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'fake' } }));
  const app = makeFakeAgent();
  const sessions = yield* AcpAgent.Sessions.make();
  const options: AcpAgent.AgentOptions = {
    id: 'fake',
    sessions,
    connect: () => Effect.succeed(inMemory(app)),
    workspace: () => Effect.succeed('/work'),
  };
  return { feed, chat, app, sessions, options };
});

const transcript = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(Message.Message)).run.pipe(
    Effect.map((messages) => messages.map((message) => [message.sender.role, ...message.blocks.map(summarize)])),
  );

const summarize = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return `text:${block.text}`;
    case 'toolCall':
      return `call:${block.operationName}`;
    case 'toolResult':
      return `result:${block.result ?? `error ${block.error}`}`;
    case 'request':
      return `request:${block.title}:${block.resolution?.optionId ?? block.resolution?.outcome ?? 'open'}`;
    default:
      return block._tag;
  }
};

const findRequest = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    while (true) {
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const message = messages.find((message) => message.blocks.some((block) => block._tag === 'request'));
      if (message) {
        return message;
      }
      yield* Effect.sleep('10 millis');
    }
  });

describe('AcpAgent', () => {
  const written: Written[] = [];
  const TestLayer = Layer.mergeAll(
    TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
    Layer.succeed(Trace.TraceService, { write: (event, payload) => void written.push({ key: event.key, payload }) }),
  );

  it.live('runs a turn into the chat: prompt, tool call, reply, stats', () =>
    Effect.gen(function* () {
      written.length = 0;
      const { feed, chat, options } = yield* setup();
      yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'tool please' });
      expect(yield* transcript(feed)).toEqual([
        ['user', 'text:tool please'],
        ['assistant', 'call:Write note.txt'],
        ['tool', 'result:wrote 1 line'],
        ['assistant', 'text:echo: tool please'],
        ['assistant', 'stats'],
      ]);
      expect(written.filter(({ key }) => key === Trace.RequestPhase.key).map(({ payload }) => payload)).toMatchObject([
        { phase: 'calling-tool', detail: 'Preparing file…' },
        { phase: 'calling-tool', detail: 'Write note.txt' },
      ]);
      expect(AcpAgent.sessionIdOf(chat, 'fake')).toBe('fake-1');
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('streams the reply under the id of the message it becomes', () =>
    Effect.gen(function* () {
      written.length = 0;
      const { feed, chat, options } = yield* setup();
      yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'hi' });
      const partials = written.filter(({ key }) => key === Trace.PartialBlock.key);
      expect(partials.map(({ payload }) => streamedText(payload))).toEqual(['echo: ', 'echo: hi']);

      // The thread replaces a streamed message with the stored one by id, so they must agree.
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const reply = messages.find((message) => Message.extractText(message) === 'echo: hi');
      expect(new Set(partials.map(({ payload }) => streamedId(payload)))).toEqual(new Set([reply?.id]));
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('parks a permission request in the chat until someone answers it', () =>
    Effect.gen(function* () {
      const { feed, chat, sessions, options } = yield* setup();
      const turn = yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'permission' }).pipe(Effect.forkChild);

      const message = yield* findRequest(feed);
      const answered = yield* AcpAgent.respond(sessions, {
        chat,
        feed,
        message,
        requestId: 'tool-2',
        optionId: 'allow',
      });
      expect(answered).toBe(true);
      yield* Fiber.join(turn);

      expect(yield* transcript(feed)).toEqual([
        ['user', 'text:permission'],
        ['assistant', 'call:Run pnpm test'],
        ['assistant', 'request:Run pnpm test:allow'],
        ['tool', 'result:allow'],
        ['assistant', 'text:echo: permission'],
        ['assistant', 'stats'],
      ]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('an interrupted turn cancels in the agent, and the session stays warm', () =>
    Effect.gen(function* () {
      const { feed, chat, sessions, options } = yield* setup();
      const turn = yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'slow' }).pipe(Effect.forkChild);
      yield* Effect.sleep('50 millis');
      yield* Fiber.interrupt(turn);
      expect(sessions.has(chat.id)).toBe(true);

      yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'again' });
      const rows = yield* transcript(feed);
      expect(rows.at(-2)).toEqual(['assistant', 'text:echo: again']);
      expect(AcpAgent.sessionIdOf(chat, 'fake')).toBe('fake-1');
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('a restarted app reloads the session the chat recorded', () =>
    Effect.gen(function* () {
      const { feed, chat, app, options } = yield* setup();
      yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'first' });

      // A new pool stands in for the app after a restart: nothing is warm, the agent's history remains.
      const restarted = yield* AcpAgent.Sessions.make();
      yield* AcpAgent.runTurn(
        { ...options, sessions: restarted, connect: () => Effect.succeed(inMemory(app)) },
        { chat, feed },
        { prompt: 'second' },
      );
      expect(AcpAgent.sessionIdOf(chat, 'fake')).toBe('fake-1');
      const replies = (yield* transcript(feed)).filter(
        ([role, block]) => role === 'assistant' && typeof block === 'string' && block.startsWith('text:'),
      );
      expect(replies).toEqual([
        ['assistant', 'text:echo: first'],
        ['assistant', 'text:echo: second'],
      ]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live("opens and reloads every session with the agent's own options", () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup();
      const opened: unknown[] = [];
      const app = makeFakeAgent({ opened });
      const meta = { fake: { allowedTools: ['read'] } };
      const withMeta = { ...options, sessionMeta: meta, connect: () => Effect.succeed(inMemory(app)) };
      yield* AcpAgent.runTurn(withMeta, { chat, feed }, { prompt: 'first' });
      yield* AcpAgent.runTurn(
        { ...withMeta, sessions: yield* AcpAgent.Sessions.make() },
        { chat, feed },
        { prompt: 'second' },
      );
      expect(opened).toEqual([meta, meta]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('starts over when the agent no longer has the session the chat recorded', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup();
      Obj.update(chat, (chat) => {
        Obj.getMeta(chat).keys.push({ source: AcpAgent.sessionKeySource('fake'), id: 'removed' });
      });

      yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'hello' });
      expect(AcpAgent.sessionIdOf(chat, 'fake')).toBe('fake-1');
      expect((yield* transcript(feed)).at(-2)).toEqual(['assistant', 'text:echo: hello']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('a turn that fails cancels the requests it left open', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup();
      const exit = yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'crash' }).pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
      expect(yield* transcript(feed)).toContainEqual(['assistant', 'request:Delete everything:cancelled']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('an answer nobody is waiting for records the request as cancelled', () =>
    Effect.gen(function* () {
      const { feed, chat, sessions } = yield* setup();
      // As after a restart: the request is in the chat, but no agent holds it any more.
      const message = Message.make({
        sender: 'assistant',
        blocks: [
          {
            _tag: 'request',
            requestId: 'tool-9',
            title: 'Run make',
            options: [{ id: 'allow', label: 'Yes', kind: 'allow_once' }],
          },
        ],
      });
      yield* Feed.append(feed, [message]);

      const answered = yield* AcpAgent.respond(sessions, {
        chat,
        feed,
        message,
        requestId: 'tool-9',
        optionId: 'allow',
      });
      expect(answered).toBe(false);
      expect(yield* transcript(feed)).toEqual([['assistant', 'request:Run make:cancelled']]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});
