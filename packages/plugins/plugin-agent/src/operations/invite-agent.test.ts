//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Hypergraph, Obj, Relation } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { BrainSkill } from '#skills';
import { AgentPresence, ChatParticipant, FactEntry, Goal, Memory, Mode } from '#types';

import { ensureAnnotationFeed } from './annotations.ts';
import { makeAgent } from './create-agent.ts';
import { ensureParticipantChat } from './ensure-participant-chat.ts';
import { inviteAgent } from './invite-agent.ts';
import { composeBrief, knowledgeElsewhere } from './presence.ts';

const TYPES = [
  Agent.Agent,
  Chat.Chat,
  Skill.Skill,
  Feed.Feed,
  Text.Text,
  Instructions.Instructions,
  Mode.Mode,
  Memory.Memory,
  Goal.Goal,
  FactEntry.FactEntry,
  FactEntry.ExtractionPass,
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Message.Message,
];

const OWNER = 'did:halo:owner';
const SAID_AT = '2026-10-09T10:00:00.000Z';

/** A fact as `readSource` records it from the home conversation. */
const fact = (subject: string, predicate: string, object: string, quote: string): RDF.Fact => ({
  id: `fact-${normalizeEntityId(subject)}-${predicate}`,
  assertion: {
    subject: { kind: 'entity', entity: normalizeEntityId(subject), label: subject },
    predicate,
    object: { kind: 'literal', literal: object },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+' },
  // EDGE attributes what a member said to their DID.
  attribution: { agent: OWNER, source: 'dxn:chat', generatedAtTime: SAID_AT },
  recordedAt: SAID_AT,
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const OFFSITE = fact('team offsite', 'is held in', 'Lisbon', 'The team offsite is in Lisbon on November 14.');

describe('Inviting an agent into another space', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer({ types: TYPES, assignQueuePositions: true });
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Runs a space-scoped effect in `db`, with the graph spanning every space of the peer. */
  const inSpace =
    (db: Database.Database, { graph = true }: { graph?: boolean } = {}) =>
    <A, E>(effect: Effect.Effect<A, E, Database.Service>): Promise<A> =>
      EffectEx.runPromise(
        effect.pipe(
          Effect.provideService(Database.Service, Database.makeService(db)),
          graph ? Effect.provideService(Hypergraph.Service, Hypergraph.makeService(peer.client.graph)) : (_) => _,
          Effect.orDie,
        ),
      );

  /** The home space: an agent that talked with Mykola about an offsite, read one fact and recorded a memory. */
  const seedHome = async (db: Database.Database) =>
    inSpace(db)(
      Effect.gen(function* () {
        const agent = yield* makeAgent({ name: 'Kai', instructions: 'You are Kai, a careful planner.' });
        const person = yield* Database.add(
          Person.make({ fullName: 'Mykola', identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: OWNER }] }),
        );
        const chat = yield* ensureParticipantChat(agent, person, { owner: OWNER });
        const feed = yield* Database.load(chat.feed);
        // An EDGE-hosted chat holds a prompt twice: the queued entry and the turn's own copy.
        const prompt = () =>
          Message.make({
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: 'The team offsite is in Lisbon on November 14.' }],
          });
        yield* Feed.append(feed, [
          prompt(),
          prompt(),
          Message.make({
            sender: { role: 'assistant' },
            blocks: [{ _tag: 'text', text: 'Noted: Lisbon, November 14.' }],
          }),
        ]);

        // Facts as the end-of-turn read records them, in the chat's annotation feed.
        const annotations = yield* ensureAnnotationFeed(agent, { id: chat.id, name: 'Mykola' });
        const pass = Obj.make(FactEntry.ExtractionPass, {
          name: 'Mykola',
          recordedAt: SAID_AT,
          extractor: { id: 'test', model: 'test', version: '1' },
          facts: 1,
        });
        yield* Feed.append(annotations, [Obj.make(FactEntry.FactEntry, { fact: { ...OFFSITE, pass: pass.id } }), pass]);

        const memory = yield* Database.add(
          Memory.make({ content: 'Mykola prefers window seats.', kind: 'preference' }),
        );
        yield* Database.add(HasSubject.make({ [Relation.Source]: memory, [Relation.Target]: person }));
        yield* Database.flush();
        return { agent, person, chat };
      }),
    );

  test('the agent joins once, keyed to its home, and its first chat remembers the home space', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const { agent } = await seedHome(home);

    const first = await inSpace(other)(inviteAgent(agent));
    expect(first.created).toBe(true);
    expect(Obj.getDatabase(first.agent)?.spaceId).toBe(other.spaceId);
    expect(first.agent.name).toBe('Kai');
    expect(AgentPresence.homeOf(first.agent)).toBe(Obj.getURI(agent));
    expect(AgentPresence.brainOf(first.agent)).toBe(AgentPresence.brainOf(agent));
    const { text } = await inSpace(other)(Agent.loadInstructions(first.agent));
    expect(text).toBe('You are Kai, a careful planner.');

    // Inviting again, or inviting the presence itself, finds it.
    const again = await inSpace(other)(inviteAgent(agent));
    expect(again).toMatchObject({ created: false });
    expect(again.agent.id).toBe(first.agent.id);
    expect((await inSpace(other)(inviteAgent(first.agent))).agent.id).toBe(first.agent.id);
    // Back home the agent is itself.
    expect((await inSpace(home)(inviteAgent(first.agent))).agent.id).toBe(agent.id);

    // The shared first chat starts with what the agent learned at home; another member's private chat is not quoted.
    const notes = await inSpace(other)(
      Effect.gen(function* () {
        const chat = yield* Agent.loadChat(first.agent);
        if (!chat) {
          return [];
        }
        return yield* Feed.query(yield* Database.load(chat.feed), Filter.type(Message.Message)).run;
      }),
    );
    expect(notes).toHaveLength(1);
    const [note] = notes;
    expect(note.blocks[0]).toMatchObject({ _tag: 'text', disposition: 'synthetic' });
    const brief = Message.extractText(note);
    expect(brief.startsWith(BrainSkill.MEMORY_HEADER)).toBe(true);
    expect(brief).toContain('team offsite is held in Lisbon (2026-10-09, said by Mykola)');
    expect(brief).not.toContain(OWNER);
    expect(brief).toContain('Mykola prefers window seats.');
    expect(brief).not.toContain('November 14.');
  });

  test("a member's new chat in the other space starts with their conversation at home", async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const { agent } = await seedHome(home);
    const { agent: presence } = await inSpace(other)(inviteAgent(agent));

    const messages = await inSpace(other)(
      Effect.gen(function* () {
        const person = yield* Database.add(Person.make({ fullName: 'Mykola' }));
        const chat = yield* ensureParticipantChat(presence, person, { owner: OWNER });
        expect(ChatParticipant.getOwner(chat)).toBe(OWNER);
        return yield* Feed.query(yield* Database.load(chat.feed), Filter.type(Message.Message)).run;
      }),
    );
    expect(messages).toHaveLength(1);
    const brief = Message.extractText(messages[0]);
    expect(brief.split('Mykola: The team offsite is in Lisbon on November 14.')).toHaveLength(2);
    expect(brief).toContain('You: Noted: Lisbon, November 14.');
  });

  test('the knowledge of every other space the agent is in is read through the graph', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const { agent } = await seedHome(home);
    const { agent: presence } = await inSpace(other)(inviteAgent(agent));

    const elsewhere = await inSpace(other)(knowledgeElsewhere([presence]));
    expect(elsewhere.map(({ spaceId }) => spaceId)).toEqual([home.spaceId]);
    const [knowledge] = elsewhere;
    expect(knowledge.facts.map(({ fact }) => fact.id)).toEqual([OFFSITE.id]);
    expect(knowledge.memories.map(({ memory }) => memory.content)).toEqual(['Mykola prefers window seats.']);
    expect(knowledge.memories[0].subjects).toHaveLength(1);
    expect(knowledge.entities.map((entity) => Reflect.get(entity, 'fullName'))).toEqual(['Mykola']);

    // From home, the presence's space is elsewhere too: one brain, read from either side.
    expect((await inSpace(home)(knowledgeElsewhere([agent]))).map(({ spaceId }) => spaceId)).toEqual([other.spaceId]);
  });

  test('without a graph an agent reads only the space it runs in', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const { agent } = await seedHome(home);
    const { agent: presence } = await inSpace(other)(inviteAgent(agent));

    expect(await inSpace(other, { graph: false })(knowledgeElsewhere([presence]))).toEqual([]);
    expect(await inSpace(other, { graph: false })(composeBrief(presence))).toBeUndefined();
  });
});
