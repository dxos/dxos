//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { BrainSkill, ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentOperation, ChatParticipant, Goal, Memory, Mode, Relay, type Trigger, TriggerOperation } from '#types';

import { loadChats } from '../operations/agent-skills.ts';
import { COMPOSE_PROMPT } from '../operations/compose-update.ts';
import { BRAIN_SCENARIO as SCENARIO } from './scenario.ts';
import { createLocalAgent, makeTestBrain, makeTestSpaceLayer } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

/** The first line of pipeline-rdf's extraction prompt, which is how the script tells extraction calls apart. */
const EXTRACTION_PROMPT = 'You extract atomic propositions';

type Refs = { agent?: string; alice?: string; bob?: string };

const { text, toolCall } = ScriptedLanguageModel;

/** The text of the request's last user message. */
const lastUserText = (request: ScriptedLanguageModel.ScriptedRequest): string => {
  const lastUser = request.prompt.content.findLast((message) => message.role === 'user');
  if (lastUser === undefined) {
    return '';
  }
  return typeof lastUser.content === 'string'
    ? lastUser.content
    : lastUser.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
};

/** A watch on a person's work, as the goals skill asks the model to set one up. */
const watchWork = (refs: Refs, requester: 'alice' | 'bob', subject: string) =>
  toolCall(Operation.toolName(TriggerOperation.WatchFacts), {
    agent: refs.agent,
    requester: refs[requester],
    request: requester === 'alice' ? SCENARIO.alice.ask : SCENARIO.bob.ask,
    outcome: `${requester === 'alice' ? 'Alice' : 'Bob'} is kept posted on ${subject}'s work`,
    when: { speaker: subject },
    message: `Update on ${subject}: {fact}`,
    ongoing: true,
  });

/**
 * A scripted model standing in for the agent: requests to be kept posted become ongoing watches,
 * extraction answers from {@link SCENARIO}'s facts, a composed update is {@link SCENARIO.composed}, and a
 * woken chat replies with what it was woken to pass on.
 */
const makeScript =
  (refs: Refs): ScriptedLanguageModel.ScriptedTurnGenerator =>
  (request) => {
    if (request.text.startsWith(COMPOSE_PROMPT)) {
      return { parts: [text(SCENARIO.composed)] };
    }
    if (request.text.includes(EXTRACTION_PROMPT)) {
      const facts = SCENARIO.facts
        .filter(({ quote }) => request.text.includes(quote))
        .map((fact) => ({ ...fact, factuality: 'CT+', polarity: '+' }));
      return { parts: [text(JSON.stringify({ facts }))] };
    }
    if (request.text.includes('Suggest a name for this chat')) {
      return { parts: [text('Kai')] };
    }
    if (request.prompt.content.at(-1)?.role === 'tool') {
      return { parts: [text("I'll keep you posted.")] };
    }
    const said = lastUserText(request);
    const woken = BrainSkill.wakeText(said);
    if (woken !== undefined) {
      return { parts: [text(woken)] };
    }
    if (said.includes(SCENARIO.alice.ask)) {
      return { parts: [watchWork(refs, 'alice', 'Bob')] };
    }
    if (said.includes(SCENARIO.bob.ask)) {
      return { parts: [watchWork(refs, 'bob', 'Alice')] };
    }
    return { parts: [text('Thanks.')] };
  };

const refs: Refs = {};
const brain = makeTestBrain();
const testSpaceLayer = makeTestSpaceLayer([
  { did: SCENARIO.alice.did, displayName: 'Alice' },
  { did: SCENARIO.bob.did, displayName: 'Bob' },
]);

const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      operationHandlers: AgentOperationHandlerSet,
      extraServices: Layer.merge(brain.layer, testSpaceLayer),
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
        Memory.Memory,
        Goal.Goal,
        Mode.Mode,
        Relay.Relay,
        Message.Message,
      ],
      skills: [ConversationSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make(), BrainSkill.make()],
      aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),
    }),
  ),
);

/** Kai, with a private chat for Alice and one for Bob. */
const setup = Effect.fnUntraced(function* () {
  const { agent: agentRef } = yield* createLocalAgent(SCENARIO.agent);
  const agent = yield* Database.load(agentRef);
  const open = (identityDid: string, name: string) =>
    Operation.invoke(AgentOperation.OpenPrivateChat, { agent: agentRef, identityDid, name }).pipe(
      Effect.flatMap(({ chat, person }) => Effect.all({ chat: Database.load(chat), person: Database.load(person) })),
    );
  const alice = yield* open(SCENARIO.alice.did, 'Alice');
  const bob = yield* open(SCENARIO.bob.did, 'Bob');
  yield* Database.flush();
  Object.assign(refs, { agent: Obj.getURI(agent), alice: Obj.getURI(alice.person), bob: Obj.getURI(bob.person) });
  return { agent, alice, bob };
});

/** Submits a prompt as `name` and waits for the turn and its end-of-turn hooks. */
const say = Effect.fnUntraced(function* (chat: Chat.Chat, name: string, prompt: string) {
  const session = yield* AgentService.getSession(chat);
  yield* session.submitPrompt(prompt, { sender: { name } });
  yield* session.waitForCompletion();
});

/** Waits for the chat's current turn, e.g. one the brain woke. */
const settle = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const session = yield* AgentService.getSession(chat);
  yield* session.waitForCompletion();
});

/** The agent's replies in the chat. */
const messages = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed);
  return yield* Feed.query(feed, Filter.type(Message.Message)).run;
});

const replies = (chat: Chat.Chat) =>
  messages(chat).pipe(
    Effect.map((all) => all.filter((message) => message.sender.role === 'assistant').map(Message.extractText)),
  );

const watchesOn = (triggers: readonly Trigger.Trigger[], speaker: string) =>
  triggers.filter(({ when, ongoing }) => when.speaker === speaker && ongoing);

describe('agent brain (local)', () => {
  afterEach(() => {
    brain.triggers.snapshot.forEach(({ id }) => brain.triggers.remove(id));
  });

  it.effect(
    'E2E 1: Alice asks to be kept posted on Bob; Bob says what he is working on; Alice is told in her own chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();

        // Each chat is private to its member.
        expect(ChatParticipant.getOwner(alice.chat)).toBe(SCENARIO.alice.did);
        expect(ChatParticipant.getOwner(bob.chat)).toBe(SCENARIO.bob.did);

        yield* say(alice.chat, 'Alice', SCENARIO.alice.ask);
        expect(watchesOn(brain.triggers.list(agent.id), SCENARIO.bob.did)).toHaveLength(1);

        yield* say(bob.chat, 'Bob', SCENARIO.bob.working);
        yield* settle(alice.chat);

        // The brain woke Alice's chat, and the agent's reply there carries Bob's update.
        expect(yield* replies(alice.chat)).toContain(SCENARIO.composed);
        expect(yield* replies(bob.chat)).not.toContain(SCENARIO.composed);

        // The relay is a synthetic note (rendered as a system message), never a user utterance.
        const relays = (yield* messages(alice.chat)).flatMap(({ blocks }) =>
          blocks.filter((block) => block._tag === 'text' && BrainSkill.wakeText(block.text) !== undefined),
        );
        expect(relays.length).toBeGreaterThan(0);
        expect(relays.every((block) => block._tag === 'text' && block.disposition === 'synthetic')).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'Facts 1: "I\'m working on X" becomes a fact in the brain',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, bob } = yield* setup();
        yield* say(bob.chat, 'Bob', SCENARIO.bob.working);

        const store = brain.facts(agent.id);
        expect(store).toBeDefined();
        const facts = store ? yield* store.query({ subjectEntity: SCENARIO.bob.did }) : [];
        expect(facts.map(({ assertion, attribution }) => ({ assertion, speaker: attribution.agent }))).toEqual([
          {
            assertion: expect.objectContaining({
              subject: expect.objectContaining({ entity: SCENARIO.bob.did }),
              predicate: 'works on',
              object: expect.objectContaining({ entity: SCENARIO.workEntity }),
              quote: SCENARIO.bob.working,
            }),
            speaker: SCENARIO.bob.did,
          },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'Goals 1: "keep me updated about what Alice is working on" becomes a goal Bob owns and a watch on Alice',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, bob } = yield* setup();
        yield* say(bob.chat, 'Bob', SCENARIO.bob.ask);

        const goals = yield* Database.query(Filter.type(Goal.Goal)).run;
        expect(goals.map(({ title, status }) => ({ title, status }))).toEqual([
          { title: "Bob is kept posted on Alice's work", status: 'active' },
        ]);
        expect(goals[0].owners.map((owner) => owner.target?.id)).toEqual([bob.person.id]);

        const [watch, ...others] = watchesOn(brain.triggers.list(agent.id), SCENARIO.alice.did);
        expect(others).toHaveLength(0);
        expect(watch.goal?.target?.id).toBe(goals[0].id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'shows each member only their own private chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        const visible = (did: string) =>
          loadChats(agent).pipe(
            Effect.map((chats) =>
              chats.filter((chat) => ChatParticipant.isVisibleTo(chat, did)).map((chat) => chat.id),
            ),
          );
        const primary = yield* Agent.loadChat(agent);
        expect((yield* visible(SCENARIO.alice.did)).sort()).toEqual([primary?.id, alice.chat.id].sort());
        expect((yield* visible(SCENARIO.bob.did)).sort()).toEqual([primary?.id, bob.chat.id].sort());

        // Opening it again returns the same chat.
        const { chat: again } = yield* Operation.invoke(AgentOperation.OpenPrivateChat, {
          agent: Ref.make(agent),
          identityDid: SCENARIO.alice.did,
          name: 'Alice',
        });
        expect(again.target?.id ?? (yield* Database.load(again)).id).toBe(alice.chat.id);

        // Asking for it on EDGE moves the same chat there rather than leaving it local.
        expect(alice.chat.remote).toBeFalsy();
        const { chat: moved } = yield* Operation.invoke(AgentOperation.OpenPrivateChat, {
          agent: Ref.make(agent),
          identityDid: SCENARIO.alice.did,
          name: 'Alice',
          remote: true,
        });
        const movedChat = yield* Database.load(moved);
        expect(movedChat.id).toBe(alice.chat.id);
        expect(movedChat.remote).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'keeps a private chat apart from a shared chat with the same person',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* createLocalAgent(SCENARIO.agent);
        const carol = yield* Database.add(
          Person.make({
            fullName: 'Carol',
            identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: 'did:halo:carol' }],
          }),
        );
        const { chat: sharedRef } = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make<Obj.Unknown>(carol),
        });
        const { chat: privateRef } = yield* Operation.invoke(AgentOperation.OpenPrivateChat, {
          agent: agentRef,
          identityDid: 'did:halo:carol',
          name: 'Carol',
        });
        const shared = yield* Database.load(sharedRef);
        const owned = yield* Database.load(privateRef);
        expect(owned.id).not.toBe(shared.id);
        expect(ChatParticipant.getOwner(owned)).toBe('did:halo:carol');
        expect(ChatParticipant.getOwner(shared)).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
