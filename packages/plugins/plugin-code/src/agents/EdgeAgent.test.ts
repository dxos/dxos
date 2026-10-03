//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as RpcTest from 'effect/rpc/RpcTest';

import { Chat } from '@dxos/assistant';
import { type RemoteProcessManager } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { type ContentBlock, Message } from '@dxos/types';

import { AgentError } from '../errors.ts';
import * as EdgeAgent from './EdgeAgent.ts';
import * as EdgeProtocol from './EdgeProtocol.ts';

type Script = (turnId: string) => EdgeProtocol.Output[];

/** EDGE's process routes for one coding-agent process, answering each prompt with a script. */
class FakeEdge implements EdgeAgent.ProcessControl {
  readonly spawned: RemoteProcessManager.SpawnRequest[] = [];
  readonly inputs: unknown[] = [];
  readonly credentials: EdgeProtocol.AnthropicCredential[] = [];
  readonly answers: { requestId: string; optionId: string | null }[] = [];
  readonly #events: RemoteProcessManager.Event[] = [];

  constructor(readonly script: Script) {}

  spawn = (request: RemoteProcessManager.SpawnRequest) =>
    Effect.sync(() => {
      this.spawned.push(request);
      return snapshot();
    });

  submitInput = ({ input }: RemoteProcessManager.ProcessTarget & { readonly input: unknown }) =>
    Effect.sync(() => {
      this.inputs.push(input);
      if (
        typeof input === 'object' &&
        input !== null &&
        '_tag' in input &&
        input._tag === 'prompt' &&
        'turnId' in input
      ) {
        this.emit(...this.script(String(input.turnId)));
      }
    });

  readEvents = ({ cursor }: RemoteProcessManager.ProcessTarget & { readonly cursor: number }) =>
    Effect.sync((): RemoteProcessManager.EventPage => ({
      events: this.#events.filter((event) => event.seq >= cursor),
      cursor: this.#events.length,
      truncated: false,
      snapshot: snapshot(),
    }));

  rpc = () =>
    RpcTest.makeClient(EdgeProtocol.Control).pipe(
      Effect.provide(
        EdgeProtocol.Control.toLayer({
          provideAuth: (credential) =>
            Effect.sync(() => {
              this.credentials.push(credential);
            }),
          respondPermission: (answer) =>
            Effect.sync(() => {
              this.answers.push(answer);
              return { answered: true };
            }),
          getState: () =>
            Effect.succeed({
              status: 'ready' as const,
              sessionId: null,
              turnId: null,
              restarts: 0,
              hasCredential: true,
            }),
        }),
      ),
    );

  emit(...outputs: EdgeProtocol.Output[]) {
    for (const data of outputs) {
      this.#events.push({ _tag: 'output', seq: this.#events.length, data });
    }
  }
}

const snapshot = (): RemoteProcessManager.Snapshot => ({
  pid: Process.ID.make('process-1'),
  parentPid: null,
  key: EdgeProtocol.PROCESS_KEY,
  params: { name: null, annotations: {} },
  environment: {},
  state: Process.State.HYBERNATING,
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  alarmDueAt: null,
});

const text = (turnId: string, value: string): EdgeProtocol.Output => ({
  _tag: 'update',
  turnId,
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: value } },
});

const API_KEY: EdgeProtocol.AnthropicCredential = { kind: 'api-key', value: 'sk-ant-test' };

const setup = Effect.fn(function* (script: Script, mode?: string) {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'edge' } }));
  const edge = new FakeEdge(script);
  const options: EdgeAgent.Options = {
    definition: {
      id: 'edge',
      label: 'Edge agent',
      icon: 'icon',
      credential: Effect.succeed(API_KEY),
      ...(mode !== undefined && { mode: () => mode }),
    },
    control: () => edge,
  };
  return { feed, chat, edge, options };
});

const transcript = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(Message.Message)).run.pipe(
    Effect.map((messages) => messages.map((message) => [message.sender.role, ...message.blocks.map(summarize)])),
  );

const summarize = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return `text:${block.text}`;
    case 'request':
      return `request:${block.title}:${block.resolution?.optionId ?? block.resolution?.outcome ?? 'open'}`;
    default:
      return block._tag;
  }
};

describe('EdgeAgent', () => {
  const TestLayer = Layer.mergeAll(
    TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
    Layer.succeed(Trace.TraceService, { write: () => {} }),
  );

  it.live('spawns the chat its process once, lends the credential, and folds the turn into the chat', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup(
        (turnId) => [
          { _tag: 'status', status: 'ready' },
          text(turnId, 'hello '),
          text(turnId, 'world'),
          { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
        ],
        'bypassPermissions',
      );
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'say hello' });
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'again' });

      expect(yield* transcript(feed)).toEqual([
        ['user', 'text:say hello'],
        ['assistant', 'text:hello world'],
        ['assistant', 'stats'],
        ['user', 'text:again'],
        ['assistant', 'text:hello world'],
        ['assistant', 'stats'],
      ]);
      expect(edge.spawned).toHaveLength(1);
      expect(edge.spawned[0]).toMatchObject({
        key: EdgeProtocol.PROCESS_KEY,
        annotations: {
          [EdgeProtocol.Annotation.unattended]: true,
          [EdgeProtocol.Annotation.mode]: 'bypassPermissions',
        },
      });
      expect(Obj.getKeys(chat, EdgeAgent.processKeySource('edge')).map(({ id }) => id)).toEqual(['process-1']);
      expect(edge.credentials).toEqual([API_KEY, API_KEY]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('lends the credential again when the process asks for it', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup((turnId) => [
        { _tag: 'auth-required' },
        text(turnId, 'done'),
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'go' });
      expect(edge.credentials).toHaveLength(2);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('shows a permission EDGE already denied as an answered card', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        {
          _tag: 'permission',
          turnId,
          requestId: 'permission-1',
          request: {
            toolCall: { toolCallId: 'call-1', title: 'Delete files' },
            options: [{ optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
          },
          resolution: { optionId: 'reject' },
        },
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'clean up' });
      expect(yield* transcript(feed)).toContainEqual(['assistant', 'request:Delete files:reject']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('ignores what another turn produced', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        text('some-other-turn', 'stale'),
        text(turnId, 'fresh'),
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'go' });
      expect(yield* transcript(feed)).toContainEqual(['assistant', 'text:fresh']);
      expect(yield* transcript(feed)).not.toContainEqual(['assistant', 'text:stale']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('fails the turn EDGE gave up on', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        { _tag: 'status', status: 'restarting', detail: 'the agent stopped' },
        { _tag: 'turn-end', turnId, stopReason: 'error', error: 'Gave up after 4 attempts.' },
      ]);
      const error = yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'go' }).pipe(Effect.flip);
      expect(error).toBeInstanceOf(AgentError);
      expect(error.message).toBe('Gave up after 4 attempts.');
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});
