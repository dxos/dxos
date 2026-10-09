//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import {
  AgentOperation,
  BrainService,
  ChatParticipant,
  Goal,
  Memory,
  MemoryOperation,
  Mode,
  Relay,
  TriggerOperation,
} from '#types';

import * as BrainInspection from '../brain/BrainInspection.ts';
import { TEST_MEMBERS, makeTestBrain, testSpaceLayer } from '../brain/testing.ts';

EntityId.dangerouslyDisableRandomness();

const { text } = ScriptedLanguageModel;

/** The first line of pipeline-rdf's extraction prompt, which is how the script tells extraction calls apart. */
const EXTRACTION_PROMPT = 'You extract atomic propositions';

const TRANSCRIPT = [
  '**Rich:** Kai, can you track the flaky CI investigation?',
  '**Dima:** I own the indexer. The race is in the v12 index migration.',
  '**Josiah:** I will review the fix.',
].join('\n\n');

/** Facts the model "finds"; each is returned only by a chunk whose text contains its quote. */
const FACTS = [
  { subject: 'Dima', predicate: 'owns', object: 'indexer', quote: 'I own the indexer.' },
  {
    subject: 'race',
    predicate: 'is in',
    object: 'v12 index migration',
    quote: 'The race is in the v12 index migration.',
  },
  { subject: 'Josiah', predicate: 'reviews', object: 'fix', quote: 'I will review the fix.', force: 'commissive' },
];

/** Extraction calls made so far, so a test can tell a read that reached the model from one that did not. */
const extractions = { count: 0 };

const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  if (!request.text.includes(EXTRACTION_PROMPT)) {
    return { parts: [text('Unexpected request.')] };
  }
  extractions.count++;
  const facts = FACTS.filter(({ quote }) => request.text.includes(quote)).map((fact) => ({
    ...fact,
    factuality: 'CT+',
    polarity: '+',
  }));
  return { parts: [text(JSON.stringify({ facts }))] };
};

const brain = makeTestBrain();

const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      extraServices: Layer.merge(brain.layer, testSpaceLayer),
      operationHandlers: AgentOperationHandlerSet,
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
        Markdown.Document,
      ],
      skills: [ConversationSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make()],
      aiService: ScriptedLanguageModel.scriptedAiService(script),
    }),
  ),
);

/** The agent's facts as its brain holds them. */
const brainFacts = (agent: Agent.Agent) => BrainService.BrainService.use((service) => service.query(agent.id, {}));

/** How many feeds the space holds: reading a source must not add one. */
const feedCount = Database.query(Filter.type(Feed.Feed)).run.pipe(Effect.map((feeds) => feeds.length));

describe('ReadSource', () => {
  it.effect(
    "pushes the document's facts, attributed to their speakers, to the agent's brain and writes nothing to the space",
    Effect.fnUntraced(
      function* ({ expect }) {
        const dima = yield* Database.add(
          Person.make({
            fullName: 'Dima',
            preferredName: 'Dima',
            identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: TEST_MEMBERS.dima }],
          }),
        );
        const document = yield* Database.add(Markdown.make({ name: 'CI triage', content: TRANSCRIPT }));
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chatsBefore = (yield* Database.query(Filter.type(Chat.Chat)).run).length;
        const feedsBefore = yield* feedCount;

        const result = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(document),
        });
        expect(result).toEqual({ facts: 3, fired: [], undelivered: [] });
        // A direct model call: reading creates no conversation, and the facts stay out of the space.
        expect((yield* Database.query(Filter.type(Chat.Chat)).run).length).toBe(chatsBefore);
        expect(yield* feedCount).toBe(feedsBefore);

        const facts = yield* brainFacts(agent);
        expect(facts).toHaveLength(3);
        const owns = facts.find((fact) => fact.assertion.predicate === 'owns');
        expect(owns?.attribution).toMatchObject({
          agent: TEST_MEMBERS.dima,
          agentLabel: 'Dima',
          source: Obj.getURI(document),
        });
        // A member named in a fact is keyed by their DID; the name stays the label.
        expect(owns?.assertion.subject).toEqual({ kind: 'entity', entity: TEST_MEMBERS.dima, label: 'Dima' });
        expect(owns?.attribution.generatedAtTime).toBeTypeOf('string');
        expect(facts.find((fact) => fact.assertion.predicate === 'reviews')?.illocution?.force).toBe('commissive');

        // A document is read whole every time; the brain keeps one copy of each fact.
        yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(document),
        });
        expect(yield* brainFacts(agent)).toHaveLength(3);
        expect(yield* feedCount).toBe(feedsBefore);

        // Recall finds the facts about a person, or said by them, by their DID; Josiah's are left out.
        const recalled = yield* Operation.invoke(MemoryOperation.Recall, { subject: Ref.make<Obj.Unknown>(dima) });
        expect(recalled.facts.map(({ fact }) => fact).sort()).toEqual([
          'Dima owns indexer',
          'race is in v12 index migration',
        ]);
        expect(recalled.facts[0]).toMatchObject({ speaker: 'Dima', sourceName: 'CI triage' });
        const searched = yield* Operation.invoke(MemoryOperation.Recall, { query: 'migration', limit: 1 });
        expect(searched.facts.map(({ fact }) => fact)).toEqual(['race is in v12 index migration']);

        // The Brain companion lists what the brain returns, shaped as its Facts list shows it.
        const snapshot = yield* Operation.invoke(TriggerOperation.InspectBrain, { agent: agentRef });
        expect(
          BrainInspection.make(snapshot)
            .facts.map(({ text }) => text)
            .sort(),
        ).toEqual(['Dima owns indexer', 'Josiah reviews fix', 'race is in v12 index migration']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'reads a chat incrementally from the cursor the brain keeps with its facts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chat = yield* Agent.loadChat(agent);
        if (!chat) {
          return expect.unreachable('The agent has a chat.');
        }
        const feed = yield* Database.load(chat.feed);
        const message = Message.make({
          sender: { role: 'user', name: 'Dima' },
          blocks: [{ _tag: 'text', text: 'I own the indexer.' }],
        });
        yield* Feed.append(feed, [message]);
        yield* Database.flush();
        const feedsBefore = yield* feedCount;

        const result = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(result.facts).toBe(1);
        const [fact] = yield* brainFacts(agent);
        expect(fact.attribution).toMatchObject({
          agent: TEST_MEMBERS.dima,
          source: Obj.getURI(message),
          generatedAtTime: message.created,
        });
        expect(yield* BrainService.BrainService.use((service) => service.readThrough(agent.id, Obj.getURI(chat)))).toBe(
          Obj.getURI(message),
        );
        expect(yield* feedCount).toBe(feedsBefore);

        // Nothing new reaches no model and pushes nothing; a new message adds only its facts.
        const before = extractions.count;
        const unchanged = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(unchanged).toEqual({ facts: 0, fired: [], undelivered: [] });
        expect(extractions.count).toBe(before);
        const next = Message.make({
          sender: { role: 'user', name: 'Josiah' },
          blocks: [{ _tag: 'text', text: 'I will review the fix.' }],
        });
        yield* Feed.append(feed, [next]);
        yield* Database.flush();
        const added = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(added.facts).toBe(1);
        expect((yield* brainFacts(agent)).map((fact) => fact.assertion.predicate).sort()).toEqual(['owns', 'reviews']);
        expect(yield* BrainService.BrainService.use((service) => service.readThrough(agent.id, Obj.getURI(chat)))).toBe(
          Obj.getURI(next),
        );
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    "attributes a private chat's unnamed prompts to the person it is with",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const { chat: chatRef } = yield* Operation.invoke(AgentOperation.OpenPrivateChat, {
          agent: agentRef,
          identityDid: 'did:halo:dima',
          name: 'Dima',
        });
        const chat = yield* Database.load(chatRef);
        const feed = yield* Database.load(chat.feed);
        yield* Feed.append(feed, [
          Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'I own the indexer.' }] }),
        ]);
        yield* Database.flush();

        yield* Operation.invoke(AgentOperation.ReadSource, { agent: agentRef, source: Ref.make<Obj.Unknown>(chat) });
        const [fact] = yield* brainFacts(yield* Database.load(agentRef));
        expect(fact.attribution.agent).toBe('did:halo:dima');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'reads a chat again from the start once the brain has lost its facts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chat = yield* Agent.loadChat(agent);
        if (!chat) {
          return expect.unreachable('The agent has a chat.');
        }
        const feed = yield* Database.load(chat.feed);
        yield* Feed.append(feed, [
          Message.make({
            sender: { role: 'user', name: 'Dima' },
            blocks: [{ _tag: 'text', text: 'I own the indexer.' }],
          }),
        ]);
        yield* Database.flush();
        yield* Operation.invoke(AgentOperation.ReadSource, { agent: agentRef, source: Ref.make<Obj.Unknown>(chat) });

        // As the in-memory brain is after a reload: the facts and the cursor are gone together.
        const store = brain.facts(agent.id);
        if (!store) {
          return expect.unreachable('The read stored facts.');
        }
        yield* store.clear();
        expect((yield* Operation.invoke(MemoryOperation.Recall, {})).facts).toEqual([]);

        // With no cursor the chat is read again from the start, and the brain recovers its facts.
        const reread = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(reread.facts).toBe(1);
        expect((yield* Operation.invoke(MemoryOperation.Recall, {})).facts.map(({ fact }) => fact)).toEqual([
          'Dima owns indexer',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'requires a source, or a url with its text',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const exit = yield* Operation.invoke(AgentOperation.ReadSource, { agent, url: 'https://example.com' }).pipe(
          Effect.exit,
        );
        expect(Exit.isFailure(exit)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
