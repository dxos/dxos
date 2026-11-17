//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { AiContext, TrajectoryStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Hook from '@dxos/compute/Hook';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill } from '#skills';
import { AgentChannels } from '#types';

import { AgentNamespace } from '../namespace.ts';
import { REMINDER } from './ensure-reply-sent.ts';

EntityId.dangerouslyDisableRandomness();

const THREAD = 'thread';

/** A channel send another plugin (as plugin-discord's `sendMessage`) contributes, so plugin-agent has no handler for it. */
const ChannelReply = Operation.make({
  meta: { key: DXN.make('com.example.operation.channelReply'), name: 'Reply in channel' },
  input: Schema.Struct({ channel: Schema.String, text: Schema.String }),
  output: Schema.Struct({ channel: Schema.String }),
}).pipe(AgentChannels.channelSend('channel'));

const ChannelSkill = Skill.make({
  key: 'com.example.skill.channel',
  name: 'Channel',
  tools: Skill.toolDefinitions({ operations: [ChannelReply] }),
});

/** The conversation's model calls, not counting the chat's title. */
let modelCalls = 0;

/** Answers the prompt by sending through {@link ChannelReply} when `send`, in plain text otherwise. */
const makeScript =
  (options: { send: boolean }): ScriptedLanguageModel.ScriptedTurnGenerator =>
  (request) => {
    if (request.text.includes('Suggest a name for this chat')) {
      return { parts: [ScriptedLanguageModel.text('Channel')] };
    }
    modelCalls++;
    if (request.prompt.content.at(-1)?.role === 'tool') {
      return { parts: [ScriptedLanguageModel.text('Sent.')] };
    }
    if (options.send && !request.text.includes(REMINDER)) {
      return {
        parts: [ScriptedLanguageModel.toolCall(Operation.toolName(ChannelReply), { channel: THREAD, text: 'Hello!' })],
      };
    }
    return { parts: [ScriptedLanguageModel.text('Hello!')] };
  };

// Agent's EDGE bundle sees only plugin-agent's capabilities (EDGE-PLUGINS D-88), so the channel send's handler is not
// among them; the turn still runs it, as the harness routes it to the plugin that owns it.
const agentOnly = CapabilityManager.make({ registry: AtomRegistry.make() });
agentOnly.contribute({
  module: 'test',
  interface: Capabilities.OperationHandler,
  implementation: AgentOperationHandlerSet,
});

const makeTestLayer = (options: { send: boolean }) =>
  AssistantTestLayer({
    operationHandlers: [
      AgentOperationHandlerSet,
      OperationHandlerSet.make(ChannelReply.pipe(Operation.withHandler(({ channel }) => Effect.succeed({ channel })))),
    ],
    types: [Chat.Chat, Skill.Skill, Feed.Feed, Message.Message],
    skills: [ConversationSkill.make(), ChannelSkill],
    agent: { hooks: () => Hook.forPlugin(AgentNamespace.key, ConversationSkill.hooks) },
    extraServices: Layer.succeed(Capability.Service, agentOnly),
    aiService: ScriptedLanguageModel.scriptedAiService(makeScript(options)),
  });

/** A session on a chat that mirrors thread {@link THREAD} of a channel, with the conversation and channel skills. */
const channelSession = Effect.fnUntraced(function* () {
  const feed = yield* Database.add(TrajectoryStore.makeFeed());
  const runtime = yield* Effect.context<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  yield* Effect.promise(() =>
    binder.bind({ skills: [ConversationSkill.make(), ChannelSkill].map(Skill.makeRef), objects: [] }),
  );
  const chat = yield* Database.add(
    Chat.make({ [Obj.Meta]: { keys: [AgentChannels.chatKey('channel', THREAD)] }, feed: Ref.make(feed) }),
  );
  return { chat, feed, session: yield* AgentService.getSession(chat) };
}, Effect.scoped);

/** The texts of the conversation's messages, synthetic follow-ups included. */
const texts = Effect.fnUntraced(function* (feed: Feed.Feed) {
  const messages = yield* TrajectoryStore.messages(feed);
  return messages.map((message) => Message.extractText(message));
});

describe('EnsureReplySent with only plugin-agent loaded', () => {
  beforeEach(() => {
    modelCalls = 0;
  });

  it.effect(
    'does not nudge after a channel send another plugin handled, and makes no extra model call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { feed, session } = yield* channelSession();
        yield* session.submitPrompt('Hi');
        yield* session.waitForCompletion();

        expect(yield* texts(feed)).not.toContain(REMINDER);
        // One call that sent, one that answered the tool result.
        expect(modelCalls).toBe(2);
      },
      Effect.provide(makeTestLayer({ send: true })),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'nudges once when the agent answered in plain text',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { feed, session } = yield* channelSession();
        yield* session.submitPrompt('Hi');
        yield* session.waitForCompletion();

        expect((yield* texts(feed)).filter((text) => text === REMINDER)).toHaveLength(1);
        // The plain answer, and the one the reminder asked for.
        expect(modelCalls).toBe(2);
      },
      Effect.provide(makeTestLayer({ send: false })),
      TestHelpers.provideTestContext,
    ),
  );
});
