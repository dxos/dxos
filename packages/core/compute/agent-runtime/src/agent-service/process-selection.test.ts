//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { HarnessControl } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { Annotation, Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Message } from '@dxos/types';

import { AssistantTestLayer, waitForMessage } from '../testing/index.ts';
import { AGENT_PROCESS_KEY, AgentInput, type AgentProcessDefinition, makeInputMessage } from './agent-process.ts';

const ECHO_PROCESS_KEY = 'com.example.process.echo';

/** Answers each prompt with its own text, so a test can tell which process ran the chat. */
const EchoProcess: AgentProcessDefinition = Operation.makeDurable({
  key: ECHO_PROCESS_KEY,
  input: AgentInput,
  output: Schema.Void,
  types: [Chat.Chat, Feed.Feed, Message.Message],
  services: [Database.Service],
  rpcs: HarnessControl,
}).pipe(
  Operation.withDurableHandler((ctx) =>
    Effect.gen(function* () {
      const chatDxn = Option.getOrThrow(Annotation.getDictionary(ctx.params.annotations, Process.TargetAnnotation));
      const chat = yield* Database.resolve(chatDxn, Chat.Chat).pipe(Effect.orDie);
      const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
      const reply = (text: string) =>
        Feed.append(feed, [
          Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: `echo: ${text}` }] }),
        ]);
      return {
        rpcHandlers: yield* HarnessControl.toHandlers({
          setAlarm: () => Effect.void,
          enqueueMessage: () => Effect.void,
        }),
        onInput: (input) => reply(Message.extractText(makeInputMessage(input))),
      };
    }),
  ),
);

const TestLayer = AssistantTestLayer({
  types: [Feed.Feed],
  agent: { processes: () => [EchoProcess] },
});

const makeChat = Effect.fnUntraced(function* (process?: string) {
  const feed = yield* Database.add(Feed.make());
  return yield* Database.add(Chat.make({ feed: Ref.make(feed), ...(process ? { session: { process } } : {}) }));
});

const runningKeys = Effect.gen(function* () {
  const manager = yield* Process.ManagerService;
  const processes = yield* manager.handles();
  return processes.map((process) => process.key);
});

describe('AgentService process selection', () => {
  it.effect(
    'runs a chat on the process its session names',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat(ECHO_PROCESS_KEY);
        const session = yield* AgentService.getSession(chat);
        yield* session.submitPrompt('hello');
        const reply = yield* waitForMessage(session.feed, (message) => message.sender.role === 'assistant', {
          timeout: 5_000,
        });
        expect(Message.extractText(reply)).toBe('echo: hello');
        expect(yield* runningKeys).toEqual([ECHO_PROCESS_KEY]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "runs a chat that names no process, or one nothing contributed, on the assistant's",
    Effect.fnUntraced(
      function* (_) {
        yield* AgentService.getSession(yield* makeChat());
        yield* AgentService.getSession(yield* makeChat('com.example.process.uninstalled'));
        expect(yield* runningKeys).toEqual([AGENT_PROCESS_KEY, AGENT_PROCESS_KEY]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'moves a chat to the process its session names when that changes',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat();
        yield* AgentService.getSession(chat);
        Obj.update(chat, (chat) => {
          chat.session = { ...chat.session, process: ECHO_PROCESS_KEY };
        });
        yield* AgentService.getSession(chat);
        const manager = yield* Process.ManagerService;
        const live = (yield* manager.handles()).filter((process) => process.status.state !== Process.State.TERMINATED);
        expect(live.map((process) => process.key)).toEqual([ECHO_PROCESS_KEY]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses to run a contributed process on edge',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat(ECHO_PROCESS_KEY);
        const exit = yield* AgentService.getSession(chat, { location: 'edge' }).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        expect(yield* runningKeys).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
