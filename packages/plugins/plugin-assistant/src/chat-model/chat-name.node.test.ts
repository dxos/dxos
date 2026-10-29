//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { type MakeTurnProducer } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { Message } from '@dxos/types';

import UpdateChatName from '../operations/update-chat-name.ts';
import { ChatModel } from './chat-model.ts';
import { makeSpaceLayer, makeTestRuntime } from './testing/harness.ts';

const { text, promptIncludes, scriptedAiService } = ScriptedLanguageModel;

/** An agent of its own, as Claude Code is: it records the prompt and replies without Composer's model. */
const externalAgent: MakeTurnProducer = ({ feed }) =>
  Effect.succeed({
    getSkills: () => [],
    runTurn: () =>
      Effect.gen(function* () {
        const messages = [
          Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'Plan a fishing trip.' }] }),
          Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'Sure.' }] }),
        ];
        yield* Feed.append(feed, messages);
        return messages;
      }),
  });

const script = [
  { match: promptIncludes('Suggest a name'), turns: [{ parts: [text('Fishing Trip')] }] },
  { match: () => true, turns: [{ parts: [text('Sure.')] }] },
];

const setup = Effect.fn(function* (session?: Chat.Chat['session']) {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), ...(session && { session }) }));
  const runtime = yield* Effect.context<Database.Service>();
  const aiSession = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
  const registry = yield* AtomRegistry.AtomRegistry;
  const chatModel = new ChatModel(aiSession, yield* makeTestRuntime, feed, yield* makeSpaceLayer, {
    chat: Ref.make(chat),
    observableRegistry: registry,
  });
  return { chat, chatModel };
});

const untilNamed = (chat: Chat.Chat) =>
  Effect.gen(function* () {
    while (!chat.name) {
      yield* Effect.sleep('20 millis');
    }
    return chat.name;
  }).pipe(Effect.timeout('10 seconds'));

const layer = (agent?: MakeTurnProducer) =>
  AssistantTestLayer({
    types: [Chat.Chat, Feed.Feed, Message.Message],
    operationHandlers: [OperationHandlerSet.make(UpdateChatName)],
    aiService: scriptedAiService(script),
    ...(agent && { agent: { makeTurnProducer: agent } }),
  });

describe('ChatModel naming', { timeout: 30_000 }, () => {
  it.live(
    "names a chat on Composer's agent after its first prompt",
    Effect.fn(
      function* ({ expect }) {
        const { chat, chatModel } = yield* setup();
        yield* Effect.promise(() => chatModel.request({ message: 'Plan a fishing trip.' }));
        expect(yield* untilNamed(chat)).toBe('Fishing Trip');
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'names a chat on an agent of its own after its first prompt',
    Effect.fn(
      function* ({ expect }) {
        const { chat, chatModel } = yield* setup({ harness: 'claude-code' });
        yield* Effect.promise(() => chatModel.request({ message: 'Plan a fishing trip.' }));
        expect(yield* untilNamed(chat)).toBe('Fishing Trip');
      },
      Effect.provide(layer(externalAgent)),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'names a chat whose first prompt from here is queued behind a turn started elsewhere',
    Effect.fn(
      function* ({ expect }) {
        const { chat, chatModel } = yield* setup({ harness: 'claude-code' });
        yield* Effect.promise(() => chatModel.enqueue({ message: 'Plan a fishing trip.' }));
        expect(yield* untilNamed(chat)).toBe('Fishing Trip');
      },
      Effect.provide(layer(externalAgent)),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'leaves a chat unnamed after a synthetic prompt',
    Effect.fn(
      function* ({ expect }) {
        const { chat, chatModel } = yield* setup({ harness: 'claude-code' });
        yield* Effect.promise(() => chatModel.enqueue({ message: 'Turn report.', disposition: 'synthetic' }));
        yield* Effect.sleep('500 millis');
        expect(chat.name).toBeUndefined();
      },
      Effect.provide(layer(externalAgent)),
      TestHelpers.provideTestContext,
    ),
  );
});
