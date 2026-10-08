//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { performInvitation } from '@dxos/client/testing';
import { ProcessManager, RemoteTraceMonitor, UnifiedProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { configPreset } from '@dxos/config';
import { Context } from '@dxos/context';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EdgeProcessManager } from '@dxos/edge-compute';
import * as EffectEx from '@dxos/effect/EffectEx';
import { RDF } from '@dxos/pipeline-rdf';
import { createBuf } from '@dxos/protocols/buf';
import { Invitation_AuthMethod } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { BrainSkill, ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import { BrainService, ChatParticipant, FactEntry, Goal, Memory, Mode, Relay, type Trigger } from '#types';

import { baseInstructions } from '../instructions.ts';
import { ensureParticipantChat } from '../operations/ensure-participant-chat.ts';
import { BRAIN_SCENARIO as SCENARIO } from './scenario.ts';

/**
 * The prototype's acceptance tests against a local EDGE (`moon run edge:dev`, i.e. `wrangler dev` on
 * :8787) with the agent's chats hosted there: turns run in compute-service's process objects, tools and the
 * end-of-turn hook in operation-service, and the brain in compute-service's `BrainObject` (SQLite). Alice and
 * Bob are separate peers, each with their own client and identity, sharing one space through EDGE: each opens
 * a private chat with Kai and talks to it from their own device, as two Composer users would. The model is
 * real, so assertions check outcomes (a watch exists, a fact names Bob, Alice's chat gets an update) rather
 * than wording.
 *
 * Run: `DX_RUN_MANUAL_TESTS=1 moon run plugin-agent:test -- src/brain/brain.edge.test.ts`.
 */
describe('agent brain (edge-local)', { tags: ['manual'], timeout: 600_000 }, () => {
  /** A person's device: their own client and identity, and their replica of the shared space. */
  type Peer = {
    readonly name: string;
    readonly did: string;
    readonly client: Client;
    space?: Space;
  };

  const TYPES = [
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
    FactEntry.FactEntry,
    FactEntry.ExtractionPass,
  ];

  const openPeer = async (name: string): Promise<Peer> => {
    const client = await new Client({ config: configPreset({ edge: 'local' }), types: TYPES }).initialize();
    const identity = await client.halo.createIdentity(createBuf(ProfileDocumentSchema, { displayName: name }));
    return { name, did: identity.did, client };
  };

  let alice: Peer;
  let bob: Peer;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([openPeer('Alice'), openPeer('Bob')]);
  }, 120_000);

  afterAll(async () => {
    await Promise.all([alice?.client.destroy(), bob?.client.destroy()]);
  });

  const spaceOf = (peer: Peer): Space => {
    if (!peer.space) {
      throw new Error(`${peer.name} has not joined a space`);
    }
    return peer.space;
  };

  /** What an app provides an agent on one peer: local and EDGE process managers, with `AgentService` over both. */
  const stack = (peer: Peer) =>
    AgentServiceRuntime.layer().pipe(
      Layer.provideMerge(UnifiedProcessManager.layer),
      Layer.provideMerge(EdgeProcessManager.fromClient(peer.client)),
      Layer.provideMerge(RemoteTraceMonitor.layerNoop),
      Layer.provideMerge(ProcessManager.layer()),
      Layer.provideMerge(ServiceResolver.layerRequirements()),
      Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.empty)),
      Layer.provideMerge(Trace.layerNoop),
      Layer.provideMerge(KeyValueStore.layerMemory),
      Layer.provideMerge(AtomRegistry.layer),
      Layer.provideMerge(Database.layer(spaceOf(peer).db)),
    );

  const run = <A, E>(peer: Peer, effect: Effect.Effect<A, E, AgentService.AgentService | Database.Service>) =>
    EffectEx.runPromise(effect.pipe(Effect.provide(stack(peer)), Effect.scoped));

  /** Kai, bound to the brain's skills by registry URI (EDGE resolves them from operation-service's registry). */
  const makeAgent = Agent.makeInitialized(
    {
      name: SCENARIO.agent,
      instructions: baseInstructions(SCENARIO.agent),
      skills: [ModesSkill.key, RelaySkill.key, GoalsSkill.key, BrainSkill.key].map((key) =>
        Ref.fromURI(Skill.registryURI(key)),
      ),
    },
    Ref.fromURI(Skill.registryURI(ConversationSkill.key)),
  );

  /**
   * What `OpenPrivateChat` does when a member opens the agent: their person record (by identity) and a chat
   * private to them, written on their own device.
   */
  const openPrivateChat = (peer: Peer, agentId: string) =>
    run(
      peer,
      Effect.gen(function* () {
        const [agent] = yield* Database.query(Filter.id(agentId)).run;
        if (!Obj.instanceOf(Agent.Agent, agent)) {
          throw new Error(`${peer.name} cannot see the agent`);
        }
        const person = yield* Database.add(
          Person.make({
            fullName: peer.name,
            identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: peer.did }],
          }),
        );
        const chat = yield* ensureParticipantChat(agent, person, { owner: peer.did, remote: true });
        yield* Database.flush();
        return chat;
      }),
    );

  /** Polls until `check` holds, so EDGE's replication and alarms have time to land. */
  const eventually = <T>(read: () => Promise<T>, check: (value: T) => boolean, timeout = 180_000) =>
    vi.waitFor(
      async () => {
        const value = await read();
        if (!check(value)) {
          throw new Error(`Not yet; last saw ${JSON.stringify(value).slice(0, 2_000)}`);
        }
        return value;
      },
      { timeout, interval: 2_000 },
    );

  const replicate = async (space: Space) => {
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
  };

  /**
   * A fresh space per test, so the model never meets another test's Kai, Alice or Bob. Alice creates it and
   * Kai, invites Bob, and each opens their own chat; both replicate to EDGE, where the hosted process reads
   * the chats and the brain reads the people.
   */
  const setupOnEdge = async () => {
    const space = await alice.client.spaces.create();
    await replicate(space);
    alice.space = space;
    const agent = await run(alice, makeAgent);
    await space.internal.syncToEdge();

    // A failed invitation resolves with its error rather than rejecting.
    const [hosted, accepted] = await Promise.all(
      performInvitation({ host: space, guest: bob.client.spaces, options: { authMethod: Invitation_AuthMethod.NONE } }),
    );
    expect(hosted.error).toBeUndefined();
    expect(accepted.error).toBeUndefined();
    const joined = await eventually(
      async () => bob.client.spaces.get(space.id),
      (joined) => joined !== undefined,
    );
    if (!joined) {
      throw new Error('Bob did not join the space');
    }
    await replicate(joined);
    bob.space = joined;
    await eventually(
      () => joined.db.query(Filter.id(agent.id)).run(),
      (found) => found.length > 0,
    );

    const aliceChat = await openPrivateChat(alice, agent.id);
    const bobChat = await openPrivateChat(bob, agent.id);
    await Promise.all([space.internal.syncToEdge(), joined.internal.syncToEdge()]);
    return { agent, aliceChat, bobChat };
  };

  /** A peer talks to Kai in their own chat, as themselves. */
  const say = (peer: Peer, chat: Chat.Chat, prompt: string) =>
    run(
      peer,
      Effect.gen(function* () {
        const session = yield* AgentService.getSession(chat, { location: 'edge' });
        yield* session.submitPrompt(prompt, { sender: { name: peer.name, identityDid: peer.did } });
        yield* session.waitForCompletion();
      }),
    );

  /** What `GET /compute/brain/:spaceId/:agentId` answers; triggers arrive encoded (`BrainService.encodeTrigger`). */
  const BrainStateResponse = Schema.Struct({
    facts: Schema.Array(RDF.Fact),
    triggers: Schema.Array(Schema.Unknown),
  });

  type BrainState = { facts: readonly RDF.Fact[]; triggers: readonly Trigger.Trigger[] };

  const brainState = async (peer: Peer, agent: Agent.Agent): Promise<BrainState> => {
    const response = await peer.client.edge.http.request(
      Context.default(),
      `/compute/brain/${spaceOf(peer).id}/${agent.id}`,
      { method: 'GET' },
    );
    const { facts, triggers } = Schema.decodeUnknownSync(BrainStateResponse)(response);
    return { facts, triggers: triggers.map((trigger) => BrainService.decodeTrigger(trigger)) };
  };

  /** The agent's replies in a chat, as the peer's own replica has them. */
  const replies = (peer: Peer, chat: Chat.Chat) =>
    run(
      peer,
      Effect.gen(function* () {
        const feed = yield* Database.load(chat.feed);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        return messages.filter((message) => message.sender.role === 'assistant').map(Message.extractText);
      }),
    );

  const watchesOn = (state: BrainState, peer: Peer) =>
    state.triggers.filter(
      ({ when, rules }) =>
        (when.speaker?.toLowerCase().startsWith(peer.name.toLowerCase()) ?? false) ||
        (rules?.includes(peer.did) ?? false),
    );

  test('Goals 1: "keep me updated about what Alice is working on" becomes a goal and a watch in the brain', async () => {
    const { agent, bobChat } = await setupOnEdge();
    await say(bob, bobChat, SCENARIO.bob.ask);

    const state = await eventually(
      () => brainState(bob, agent),
      (state) => watchesOn(state, alice).length > 0,
    );
    expect(watchesOn(state, alice)[0].ongoing).toBe(true);
    // Evaluated on EDGE by rules that name Alice by her identity, which only her own client knows.
    expect(watchesOn(state, alice)[0].rules).toContain(alice.did);
    const goals = await eventually(
      () => spaceOf(bob).db.query(Filter.type(Goal.Goal)).run(),
      (goals) => goals.some(({ title }) => title.toLowerCase().includes('alice')),
    );
    expect(goals.some(({ status }) => status === 'active')).toBe(true);
  });

  test('Facts 1: "I\'m working on X" becomes a fact in the brain\'s RDF store', async () => {
    const { agent, bobChat } = await setupOnEdge();
    await say(bob, bobChat, SCENARIO.bob.working);

    const state = await eventually(
      () => brainState(alice, agent),
      ({ facts }) => facts.some((fact) => JSON.stringify(fact.assertion).toLowerCase().includes('indexer')),
    );
    const fact = state.facts.find((fact) => JSON.stringify(fact.assertion).toLowerCase().includes('indexer'));
    // Bob said it from his own client: the fact is his identity's, not a name's.
    expect(fact?.attribution.agent).toBe(bob.did);
  });

  test('E2E 1: Alice asks to be kept posted on Bob; Bob says what he is working on; Alice is told', async () => {
    const { agent, aliceChat, bobChat } = await setupOnEdge();

    await say(alice, aliceChat, SCENARIO.alice.ask);
    await eventually(
      () => brainState(alice, agent),
      (state) => watchesOn(state, bob).length > 0,
    );
    const before = (await replies(alice, aliceChat)).length;

    await say(bob, bobChat, SCENARIO.bob.working);

    // The brain woke Alice's chat on EDGE; the reply reaches Alice's own device by sync.
    const told = await eventually(
      () => replies(alice, aliceChat),
      (texts) => texts.slice(before).some((text) => text.toLowerCase().includes('indexer')),
    );
    expect(told.slice(before).join('\n').toLowerCase()).toContain('indexer');
    expect((await replies(bob, bobChat)).join('\n').toLowerCase()).not.toContain('update on bob');
  });
});
