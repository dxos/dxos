//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Hook from '@dxos/compute/Hook';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed } from '@dxos/echo';
import { type Fact } from '@dxos/echo-memory';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { type ContentBlock, HasSubject, Message, Organization, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { BrainSkill, ConversationSkill } from '#skills';
import { AgentOperation, ChatParticipant, Goal, MemoryOperation, Mode, Relay } from '#types';

import { AgentNamespace } from '../namespace.ts';
import { createLocalAgent, inlineBrainHooks, makeTestBrain, makeTestSpaceLayer, noChannelBackends } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

const BOB = { did: 'did:halo:BBOBBOBBOBBOBBOBBOBBOBBOBBOBBOBBO', name: 'Bob' };

const RECORDING_TOOLS = [
  Operation.toolName(MemoryOperation.ResolveEntity),
  Operation.toolName(MemoryOperation.Remember),
];

const brain = makeTestBrain();
const testSpaceLayer = makeTestSpaceLayer([{ did: BOB.did, displayName: BOB.name }]);

const LiveTestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      operationHandlers: AgentOperationHandlerSet,
      extraServices: Layer.mergeAll(brain.layer, testSpaceLayer, noChannelBackends),
      types: [
        Agent.Agent,
        Chat.Chat,
        Skill.Skill,
        Feed.Feed,
        Text.Text,
        Instructions.Instructions,
        Person.Person,
        Organization.Organization,
        HasSubject.HasSubject,
        Goal.Goal,
        Mode.Mode,
        Relay.Relay,
        Message.Message,
      ],
      skills: [ConversationSkill.make(), BrainSkill.make()],
      agent: { hooks: () => Hook.forPlugin(AgentNamespace.key, inlineBrainHooks) },
      aiServicePreset: 'direct',
    }),
  ),
);

/** Kai, with Bob's private chat. */
const setup = Effect.fnUntraced(function* () {
  const { agent: agentRef } = yield* createLocalAgent('Kai');
  const agent = yield* Database.load(agentRef);
  const { chat } = yield* Operation.invoke(AgentOperation.OpenPrivateChat, {
    agent: agentRef,
    identityDid: BOB.did,
    name: BOB.name,
  });
  yield* Database.flush();
  return { agent, chat: yield* Database.load(chat) };
});

/** Submits a prompt as Bob and waits for the turn and its end-of-turn hooks. */
const say = Effect.fnUntraced(function* (chat: Chat.Chat, prompt: string | ContentBlock.Any[]) {
  const session = yield* AgentService.getSession(chat);
  yield* session.submitPrompt(prompt, { sender: { name: BOB.name } });
  yield* session.waitForCompletion();
});

/** A fact's predicate and object as lower-case text, e.g. "works on background sync". */
const statement = ({ assertion: { predicate, object } }: Fact.Fact): string =>
  `${predicate} ${object.kind === 'entity' ? (object.label ?? object.entity) : object.literal}`.toLowerCase();

/** The names of the tools the agent called in the chat. */
const toolCalls = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed);
  return (yield* TrajectoryStore.messages(feed)).flatMap(({ blocks }) =>
    blocks.flatMap((block) => (block._tag === 'toolCall' ? [block.name] : [])),
  );
});

// Replays the recorded conversations from `.store/conversations` (DX_RUN_MODEL_FIXTURE_TESTS=1);
// regenerate with DX_UPDATE_MODEL_FIXTURES=1 and DX_ANTHROPIC_API_KEY set.
describe('conversation facts (live model)', { tags: ['model-fixture'] }, () => {
  afterEach(async () => {
    await brain.reset();
  });

  it.effect(
    'a decision told to the agent is recorded by the end-request hook, not by the turn',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, chat } = yield* setup();
        expect(ChatParticipant.getOwner(chat)).toBe(BOB.did);

        yield* say(chat, "FYI: we decided to ship offline mode this quarter, and I'm working on background sync.");

        expect((yield* toolCalls(chat)).filter((name) => RECORDING_TOOLS.includes(name))).toEqual([]);
        // Bob is a member, so the hook's extraction resolves his name to his DID.
        const statements = (yield* brain.facts(agent.id).query({ subjectEntity: BOB.did })).map(statement);
        expect(statements).toContainEqual(expect.stringMatching(/^works on .*background sync/));
        expect(statements).toContainEqual(expect.stringMatching(/^decided .*offline mode/));
      },
      Effect.provide(LiveTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'a decision in messages shown as context is recorded by the turn',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, chat } = yield* setup();

        yield* say(chat, [
          {
            _tag: 'text',
            text: [
              'Recent messages in #launch:',
              '[Rich]: pricing is settled: the Team plan launches at $12 per seat per month',
              '[Ana]: I am writing the launch announcement',
            ].join('\n'),
            disposition: 'synthetic',
          },
          { _tag: 'text', text: 'Kai, what is the Team plan going to cost?' },
        ]);

        expect(yield* toolCalls(chat)).toContain(Operation.toolName(MemoryOperation.Remember));
        const statements = (yield* brain.facts(agent.id).query({})).map(statement);
        expect(statements).toContainEqual(expect.stringContaining('$12 per seat'));
        expect(statements).toContainEqual(expect.stringMatching(/^works on .*launch announcement/));
      },
      Effect.provide(LiveTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
