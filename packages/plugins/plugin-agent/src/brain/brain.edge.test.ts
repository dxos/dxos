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
import { ProcessManager, RemoteTraceMonitor, UnifiedProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { configPreset } from '@dxos/config';
import { Context } from '@dxos/context';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { EdgeProcessManager } from '@dxos/edge-compute';
import * as EffectEx from '@dxos/effect/EffectEx';
import { RDF } from '@dxos/pipeline-rdf';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
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
 * end-of-turn hook in operation-service, and the brain in compute-service's `BrainObject` (SQLite). The model
 * is real, so assertions check outcomes (a watch exists, a fact names Bob, Alice's chat gets an update) rather
 * than wording.
 *
 * Run: `DX_RUN_MANUAL_TESTS=1 moon run plugin-agent:test -- src/brain/brain.edge.test.ts`.
 */
describe('agent brain (edge-local)', { tags: ['manual'], timeout: 600_000 }, () => {
  let client: Client;
  let space: Space;

  beforeAll(async () => {
    client = await new Client({
      config: configPreset({ edge: 'local' }),
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
        FactEntry.FactEntry,
        FactEntry.ExtractionPass,
      ],
    }).initialize();
    await client.halo.createIdentity();
  }, 120_000);

  afterAll(async () => {
    await client?.destroy();
  });

  /** What an app provides an agent: local and EDGE process managers, with `AgentService` over both. */
  const stack = () =>
    AgentServiceRuntime.layer().pipe(
      Layer.provideMerge(UnifiedProcessManager.layer),
      Layer.provideMerge(EdgeProcessManager.fromClient(client)),
      Layer.provideMerge(RemoteTraceMonitor.layerNoop),
      Layer.provideMerge(ProcessManager.layer()),
      Layer.provideMerge(ServiceResolver.layerRequirements()),
      Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.empty)),
      Layer.provideMerge(Trace.layerNoop),
      Layer.provideMerge(KeyValueStore.layerMemory),
      Layer.provideMerge(AtomRegistry.layer),
      Layer.provideMerge(Database.layer(space.db)),
    );

  const run = <A, E>(effect: Effect.Effect<A, E, AgentService.AgentService | Database.Service>) =>
    EffectEx.runPromise(effect.pipe(Effect.provide(stack()), Effect.scoped));

  /** Kai, bound to the brain's skills by registry URI (EDGE resolves them from operation-service's registry). */
  const setup = Effect.fnUntraced(function* () {
    const agent = yield* Agent.makeInitialized(
      {
        name: SCENARIO.agent,
        instructions: baseInstructions(SCENARIO.agent),
        skills: [ModesSkill.key, RelaySkill.key, GoalsSkill.key, BrainSkill.key].map((key) =>
          Ref.fromURI(Skill.registryURI(key)),
        ),
      },
      Ref.fromURI(Skill.registryURI(ConversationSkill.key)),
    );
    const person = (did: string, name: string) =>
      Database.add(
        Person.make({ fullName: name, identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: did }] }),
      );
    const alice = yield* person(SCENARIO.alice.did, 'Alice');
    const bob = yield* person(SCENARIO.bob.did, 'Bob');
    const aliceChat = yield* ensureParticipantChat(agent, alice, { owner: SCENARIO.alice.did, remote: true });
    const bobChat = yield* ensureParticipantChat(agent, bob, { owner: SCENARIO.bob.did, remote: true });
    yield* Database.flush();
    return { agent, alice, bob, aliceChat, bobChat };
  });

  /**
   * A fresh space per test, so the model never meets another test's Kai, Alice or Bob; Kai and the chats are
   * replicated to EDGE, since the hosted process reads the chat from EDGE's copy of the space.
   */
  const setupOnEdge = async () => {
    space = await client.spaces.create();
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    const objects = await run(setup());
    await space.internal.syncToEdge();
    return objects;
  };

  const say = Effect.fnUntraced(function* (chat: Chat.Chat, name: string, prompt: string) {
    const session = yield* AgentService.getSession(chat, { location: 'edge' });
    yield* session.submitPrompt(prompt, { sender: { name } });
    yield* session.waitForCompletion();
  });

  /** What `GET /compute/brain/:spaceId/:agentId` answers; triggers arrive encoded (`BrainService.encodeTrigger`). */
  const BrainStateResponse = Schema.Struct({
    facts: Schema.Array(RDF.Fact),
    triggers: Schema.Array(Schema.Unknown),
  });

  type BrainState = { facts: readonly RDF.Fact[]; triggers: readonly Trigger.Trigger[] };

  const brainState = async (agent: Agent.Agent): Promise<BrainState> => {
    const response = await client.edge.http.request(Context.default(), `/compute/brain/${space.id}/${agent.id}`, {
      method: 'GET',
    });
    const { facts, triggers } = Schema.decodeUnknownSync(BrainStateResponse)(response);
    return { facts, triggers: triggers.map((trigger) => BrainService.decodeTrigger(trigger)) };
  };

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

  const replies = (chat: Chat.Chat) =>
    run(
      Effect.gen(function* () {
        const feed = yield* Database.load(chat.feed);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        return messages.filter((message) => message.sender.role === 'assistant').map(Message.extractText);
      }),
    );

  const watchesOn = (state: BrainState, speaker: string) =>
    state.triggers.filter(({ when }) => when.speaker === speaker);

  test('Goals 1: "keep me updated about what Alice is working on" becomes a goal and a watch in the brain', async () => {
    const { agent, bobChat } = await setupOnEdge();
    await run(say(bobChat, 'Bob', SCENARIO.bob.ask));

    const state = await eventually(
      () => brainState(agent),
      (state) => watchesOn(state, SCENARIO.alice.did).length > 0,
    );
    expect(watchesOn(state, SCENARIO.alice.did)[0].ongoing).toBe(true);
    const goals = await eventually(
      () => space.db.query(Filter.type(Goal.Goal)).run(),
      (goals) => goals.some(({ title }) => title.toLowerCase().includes('alice')),
    );
    expect(goals.some(({ status }) => status === 'active')).toBe(true);
  });

  test('Facts 1: "I\'m working on X" becomes a fact in the brain\'s RDF store', async () => {
    const { agent, bobChat } = await setupOnEdge();
    await run(say(bobChat, 'Bob', SCENARIO.bob.working));

    const state = await eventually(
      () => brainState(agent),
      ({ facts }) => facts.some((fact) => JSON.stringify(fact.assertion).toLowerCase().includes('indexer')),
    );
    const fact = state.facts.find((fact) => JSON.stringify(fact.assertion).toLowerCase().includes('indexer'));
    expect(fact?.attribution.agent).toBe(SCENARIO.bob.did);
  });

  test('E2E 1: Alice asks to be kept posted on Bob; Bob says what he is working on; Alice is told', async () => {
    const { agent, aliceChat, bobChat } = await setupOnEdge();

    await run(say(aliceChat, 'Alice', SCENARIO.alice.ask));
    await eventually(
      () => brainState(agent),
      (state) => watchesOn(state, SCENARIO.bob.did).length > 0,
    );
    const before = (await replies(aliceChat)).length;

    await run(say(bobChat, 'Bob', SCENARIO.bob.working));

    // The brain woke Alice's chat on EDGE; the agent's reply there carries Bob's update.
    const told = await eventually(
      () => replies(aliceChat),
      (texts) => texts.slice(before).some((text) => text.toLowerCase().includes('indexer')),
    );
    expect(told.slice(before).join('\n').toLowerCase()).toContain('indexer');
    expect((await replies(bobChat)).join('\n').toLowerCase()).not.toContain('update on bob');
  });
});
