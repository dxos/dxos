//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

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
import { AgentOperation, FactEntry, Goal, Memory, MemoryOperation, Mode, Relay } from '#types';

import { forgetFact } from './annotations.ts';

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

const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  if (!request.text.includes(EXTRACTION_PROMPT)) {
    return { parts: [text('Unexpected request.')] };
  }
  const facts = FACTS.filter(({ quote }) => request.text.includes(quote)).map((fact) => ({
    ...fact,
    factuality: 'CT+',
    polarity: '+',
  }));
  return { parts: [text(JSON.stringify({ facts }))] };
};

const TestLayer = AssistantTestLayer({
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
    FactEntry.FactEntry,
    FactEntry.ExtractionPass,
  ],
  skills: [ConversationSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make()],
  aiService: ScriptedLanguageModel.scriptedAiService(script),
});

describe('ReadSource', () => {
  it.effect(
    "appends the transcript's facts, attributed to their speakers, to its annotation feed",
    Effect.fnUntraced(
      function* ({ expect }) {
        const dima = yield* Database.add(Person.make({ fullName: 'Dima', preferredName: 'Dima' }));
        const document = yield* Database.add(Markdown.make({ name: 'CI triage', content: TRANSCRIPT }));
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chatsBefore = (yield* Database.query(Filter.type(Chat.Chat)).run).length;

        const result = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(document),
        });
        expect(result.facts).toBe(3);
        // A direct model call: reading creates no conversation.
        expect((yield* Database.query(Filter.type(Chat.Chat)).run).length).toBe(chatsBefore);

        const [feed, ...others] = yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY }))
          .run;
        expect(others).toHaveLength(0);
        expect(Obj.getParent(feed)?.id).toBe(agent.id);
        // One entry per fact, then the marker closing the pass.
        const entries = yield* Feed.query(feed, Filter.type(FactEntry.FactEntry)).run;
        const [pass] = yield* Feed.query(feed, Filter.type(FactEntry.ExtractionPass)).run;
        expect(entries).toHaveLength(3);
        expect(pass).toMatchObject({ name: 'CI triage', facts: 3 });
        expect(pass.source?.target?.id).toBe(document.id);
        expect(result.pass?.target?.id).toBe(pass.id);
        expect(entries.map(({ fact }) => fact.pass)).toEqual([pass.id, pass.id, pass.id]);
        expect(Math.max(...entries.map(Feed.getPosition))).toBeLessThan(Feed.getPosition(pass));
        const owns = entries.find(({ fact }) => fact.assertion.predicate === 'owns')?.fact;
        expect(owns?.attribution).toMatchObject({ agent: 'dima', source: Obj.getURI(document) });
        expect(owns?.attribution.generatedAtTime).toBeTypeOf('string');
        expect(entries.find(({ fact }) => fact.assertion.predicate === 'reviews')?.fact.illocution?.force).toBe(
          'commissive',
        );
        // A fact's entry is found by the fact's id.
        const keyed = yield* Feed.query(
          feed,
          Filter.foreignKeys(FactEntry.FactEntry, [FactEntry.factKey(owns?.id ?? '')]),
        ).run;
        expect(keyed.map(({ fact }) => fact.assertion.predicate)).toEqual(['owns']);

        // Reading again appends to the same feed rather than opening another.
        yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(document),
        });
        expect(yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run).toHaveLength(1);
        expect(yield* Feed.query(feed, Filter.type(FactEntry.FactEntry)).run).toHaveLength(6);
        expect(yield* Feed.query(feed, Filter.type(FactEntry.ExtractionPass)).run).toHaveLength(2);

        // Recall finds the facts about a person, or said by them, by their name; Josiah's are left out.
        const recalled = yield* Operation.invoke(MemoryOperation.Recall, { subject: Ref.make<Obj.Unknown>(dima) });
        expect(recalled.facts.map(({ fact }) => fact).sort()).toEqual([
          'Dima owns indexer',
          'Dima owns indexer',
          'race is in v12 index migration',
          'race is in v12 index migration',
        ]);
        expect(recalled.facts[0]).toMatchObject({ speaker: 'dima', sourceName: 'CI triage' });
        const searched = yield* Operation.invoke(MemoryOperation.Recall, { query: 'migration', limit: 1 });
        expect(searched.facts.map(({ fact }) => fact)).toEqual(['race is in v12 index migration']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'reads a chat transcript with each message attributed to its sender',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chat = yield* Agent.loadChat(agent);
        expect(chat).toBeDefined();
        if (!chat) {
          return;
        }
        const feed = yield* Database.load(chat.feed);
        const message = Message.make({
          sender: { role: 'user', name: 'Dima' },
          blocks: [{ _tag: 'text', text: 'I own the indexer.' }],
        });
        yield* Feed.append(feed, [message]);
        yield* Database.flush();

        const result = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(result.facts).toBe(1);
        const [annotations] = yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run;
        const [entry] = yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run;
        expect(entry.fact.attribution).toMatchObject({
          agent: 'dima',
          source: Obj.getURI(message),
          generatedAtTime: message.created,
        });
        const [pass] = yield* Feed.query(annotations, Filter.type(FactEntry.ExtractionPass)).run;
        expect(pass.through).toBe(Obj.getURI(message));

        // A chat is read incrementally: nothing new appends nothing, and a new message adds only its facts.
        const unchanged = yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(chat),
        });
        expect(unchanged).toEqual({ facts: 0 });
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
        const entries = yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run;
        expect(entries.map(({ fact }) => fact.assertion.predicate).sort()).toEqual(['owns', 'reviews']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    "attributes a private chat's unnamed prompts to its owner's identity",
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
        const [annotations] = yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run;
        const [entry] = yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run;
        expect(entry.fact.attribution.agent).toBe('did:halo:dima');
        // The owner named as a subject is the same entity.
        expect(entry.fact.assertion.subject).toMatchObject({ kind: 'entity', entity: 'did:halo:dima' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'ignores the facts of a pass whose marker is missing, and resumes a chat from the last marker',
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

        // Removing the marker leaves the pass as if it had stopped before completing.
        const [annotations] = yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run;
        yield* Feed.remove(annotations, yield* Feed.query(annotations, Filter.type(FactEntry.ExtractionPass)).run);
        yield* Database.flush();
        expect((yield* Operation.invoke(MemoryOperation.Recall, {})).facts).toEqual([]);

        // With no marker there is no cursor, so the chat is read again from the start.
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
    'forgets a single fact',
    Effect.fnUntraced(
      function* ({ expect }) {
        const document = yield* Database.add(Markdown.make({ name: 'CI triage', content: TRANSCRIPT }));
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        yield* Operation.invoke(AgentOperation.ReadSource, {
          agent: agentRef,
          source: Ref.make<Obj.Unknown>(document),
        });
        const [annotations] = yield* Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run;
        const entries = yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run;
        const owns = entries.find(({ fact }) => fact.assertion.predicate === 'owns');
        if (!owns) {
          return expect.unreachable('The document states who owns the indexer.');
        }

        expect(yield* forgetFact(owns.fact.id)).toBe(1);
        expect(yield* forgetFact(owns.fact.id)).toBe(0);
        expect(yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run).toHaveLength(2);
        expect((yield* Operation.invoke(MemoryOperation.Recall, {})).facts.map(({ fact }) => fact).sort()).toEqual([
          'Josiah reviews fix',
          'race is in v12 index migration',
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
