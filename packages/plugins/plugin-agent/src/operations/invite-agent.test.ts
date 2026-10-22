//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Hypergraph, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId, IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import {
  AgentPresence,
  type AgentSpace,
  BrainService,
  ChatParticipant,
  Goal,
  MemoryOperation,
  Mode,
  TriggerOperation,
} from '#types';

import { makeTestBrain, testSpaceLayer } from '../brain/testing.ts';
import { admittedHomes } from '../capabilities/agent-admission.ts';
import { baseInstructions } from '../instructions.ts';
import { makeAgent } from './create-agent.ts';
import { pushFacts } from './deliver.ts';
import { ensureParticipantChat } from './ensure-participant-chat.ts';
import { inviteAgent, inviteeOf } from './invite-agent.ts';

const TYPES = [
  Agent.Agent,
  Chat.Chat,
  Skill.Skill,
  Feed.Feed,
  Text.Text,
  Instructions.Instructions,
  Mode.Mode,
  Goal.Goal,
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Message.Message,
];

const SAID_AT = '2026-10-09T10:00:00.000Z';

/** A fact as the end-of-turn read records it from a conversation. */
const fact = (subject: string, predicate: string, object: string, quote: string): RDF.Fact => ({
  id: `fact-${normalizeEntityId(subject)}-${predicate}`,
  assertion: {
    subject: { kind: 'entity', entity: normalizeEntityId(subject), label: subject },
    predicate,
    object: { kind: 'literal', literal: object },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { agent: 'did:halo:mykola', agentLabel: 'Mykola', source: 'dxn:chat', generatedAtTime: SAID_AT },
  recordedAt: SAID_AT,
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const OFFSITE = fact('team offsite', 'is held in', 'Lisbon', 'The team offsite is in Lisbon on November 14.');
const BUDGET = fact('team offsite', 'has budget', '8,000 euros', 'The budget is 8,000 euros.');

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
    (db: Database.Database) =>
    <A, E>(effect: Effect.Effect<A, E, Database.Service>): Promise<A> =>
      EffectEx.runPromise(
        effect.pipe(
          Effect.provideService(Database.Service, Database.makeService(db)),
          Effect.provideService(Hypergraph.Service, Hypergraph.makeService(peer.client.graph)),
          Effect.orDie,
        ),
      );

  /** Invites the agent into `db`'s space as a member who reaches the agent's own space. */
  const invite = (db: Database.Database, agent: Agent.Agent) =>
    inSpace(db)(inviteeOf(agent).pipe(Effect.flatMap(inviteAgent)));

  test('joins once, keyed to its home, with its name, DID and instructions and one brain', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const third = await peer.createDatabase();
    const agent = await inSpace(home)(makeAgent({ name: 'Kai', instructions: 'You are Kai, a careful planner.' }));

    const first = await invite(other, agent);
    expect(first.created).toBe(true);
    const presence = first.agent;
    expect(Obj.getDatabase(presence)?.spaceId).toBe(other.spaceId);
    expect(AgentPresence.homeOf(presence)).toBe(Obj.getURI(agent));
    expect(AgentPresence.brainId(presence)).toBe(agent.id);
    expect(AgentPresence.brainId(agent)).toBe(agent.id);
    expect(presence.name).toBe('Kai');
    expect(presence.did).toBe(agent.did);
    const instructions = await inSpace(other)(Agent.loadInstructions(presence));
    expect(instructions.text).toBe('You are Kai, a careful planner.');

    // The invitation starts no conversation: the presence's chat is empty.
    const messages = await inSpace(other)(
      Effect.gen(function* () {
        const chat = yield* Agent.loadChat(presence);
        return chat ? yield* Feed.query(yield* Database.load(chat.feed), Filter.type(Message.Message)).run : [];
      }),
    );
    expect(messages).toHaveLength(0);

    // Inviting again, or inviting the presence elsewhere, finds the same home.
    const again = await invite(other, agent);
    expect(again).toMatchObject({ created: false });
    expect(again.agent.id).toBe(presence.id);
    const onward = await invite(third, presence);
    expect(AgentPresence.homeOf(onward.agent)).toBe(Obj.getURI(agent));
    expect(AgentPresence.brainId(onward.agent)).toBe(agent.id);
    const back = await invite(home, presence);
    expect(back).toMatchObject({ created: false });
    expect(back.agent.id).toBe(agent.id);
    expect(await inSpace(other)(Database.query(Filter.type(Agent.Agent)).run)).toHaveLength(1);
  });

  test('an agent with an identity names its brain by its DID, in every space it is in', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const did = IdentityDid.random();
    const agent = await inSpace(home)(makeAgent({ name: 'Kai', did }));
    const { agent: presence } = await invite(other, agent);

    expect(presence.did).toBe(did);
    expect(AgentPresence.brainId(agent)).toBe(did);
    expect(AgentPresence.brainId(presence)).toBe(did);
  });

  test('a member has a conversation of their own with the agent in each space it is in', async ({ expect }) => {
    const home = await peer.createDatabase();
    const other = await peer.createDatabase();
    const agent = await inSpace(home)(makeAgent({ name: 'Kai', did: IdentityDid.random() }));
    const { agent: presence } = await invite(other, agent);
    const member = 'did:halo:alice';
    /** What opening the agent in `db`'s space gives the member (`OpenPrivateChat`). */
    const privateChat = (db: Database.Database, opened: Agent.Agent) =>
      inSpace(db)(
        Effect.gen(function* () {
          const person = yield* Database.add(
            Person.make({ identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: member }] }),
          );
          return yield* ensureParticipantChat(opened, person, { owner: member });
        }),
      );

    const atHome = await privateChat(home, agent);
    const there = await privateChat(other, presence);
    expect(there.id).not.toBe(atHome.id);
    expect(Obj.getDatabase(there)?.spaceId).toBe(other.spaceId);
    expect(Obj.getParent(there)?.id).toBe(presence.id);
    // What the agent knows is shared: both conversations reach the one brain.
    expect(AgentPresence.brainId(presence)).toBe(AgentPresence.brainId(agent));
  });

  test('only an admitted agent the member administers is put to work, and not in its own space', ({ expect }) => {
    const did = IdentityDid.random();
    const home = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
    const identityKey = PublicKey.random();
    /** The agent's own space, whose members are its admins. */
    const own = SpaceId.random();
    const other = SpaceId.random();
    const administered: AgentSpace.Summary[] = [{ spaceId: own, name: 'Kai', did, home, identityKey }];

    expect(admittedHomes(administered, [identityKey], other)).toEqual([home]);
    expect(admittedHomes(administered, [PublicKey.random()], other)).toEqual([]);
    expect(admittedHomes([], [identityKey], other)).toEqual([]);
    expect(admittedHomes(administered, [identityKey], own)).toEqual([]);
    expect(admittedHomes([{ ...administered[0], home: undefined }], [identityKey], other)).toEqual([]);
  });

  test("an admin who cannot reach the agent's home adds it from what the agent's own space records", async ({
    expect,
  }) => {
    const other = await peer.createDatabase();
    const homeId = EntityId.random();
    const home = EID.make({ spaceId: SpaceId.random(), entityId: homeId });
    const did = IdentityDid.random();

    const first = await inSpace(other)(inviteAgent({ home, name: 'Kai', did }));
    expect(first.created).toBe(true);
    expect(first.agent).toMatchObject({ name: 'Kai', did });
    expect(AgentPresence.homeOf(first.agent)).toBe(home);
    expect(AgentPresence.brainId(first.agent)).toBe(did);
    // The home's instructions are out of reach, so the presence starts from the base instructions for its name.
    expect((await inSpace(other)(Agent.loadInstructions(first.agent))).text).toBe(baseInstructions('Kai'));

    const again = await inSpace(other)(inviteAgent({ home, name: 'Kai', did }));
    expect(again).toMatchObject({ created: false });
    expect(again.agent.id).toBe(first.agent.id);
  });
});

const brain = makeTestBrain();

const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      extraServices: Layer.merge(brain.layer, testSpaceLayer),
      operationHandlers: AgentOperationHandlerSet,
      types: TYPES,
    }),
  ),
);

describe('An invited agent', () => {
  it.effect(
    "recalls from its home's brain and adds what it learns there",
    Effect.fnUntraced(
      function* ({ expect }) {
        // The home agent's brain, in a space this one cannot see: what Kai learned talking with Mykola there.
        const homeId = EntityId.random();
        const home = EID.make({ spaceId: SpaceId.random(), entityId: homeId });
        yield* BrainService.BrainService.use((service) => service.push(homeId, [OFFSITE]));

        const presence = yield* makeAgent({ name: 'Kai', keys: [AgentPresence.homeKey(home)] });
        expect(AgentPresence.brainId(presence)).toBe(homeId);

        // The Recall tool reads that brain from here.
        const recalled = yield* Operation.invoke(MemoryOperation.Recall, {});
        expect(recalled.facts.map(({ fact }) => fact)).toEqual(['team offsite is held in Lisbon']);
        expect(recalled.facts[0]).toMatchObject({ speaker: 'Mykola' });

        // What it learns here goes to the same brain, which its Brain companion lists.
        yield* pushFacts(presence, [BUDGET]);
        const facts = yield* BrainService.BrainService.use((service) => service.query(homeId, {}));
        expect(facts.map(({ id }) => id).sort()).toEqual([BUDGET.id, OFFSITE.id].sort());
        expect(yield* BrainService.BrainService.use((service) => service.query(presence.id, {}))).toEqual([]);
        const snapshot = yield* Operation.invoke(TriggerOperation.InspectBrain, { agent: Ref.make(presence) });
        expect(snapshot.facts).toHaveLength(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
