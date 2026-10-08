//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Result from 'effect/Result';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService, Model, OpaqueToolkit, Provider } from '@dxos/ai';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import {
  ProcessManager,
  ProcessOperationInvoker,
  RemoteTraceMonitor,
  UnifiedProcessManager,
  configuredCredentialsLayer,
} from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { configPreset } from '@dxos/config';
import { Database, Feed, Ref, Registry } from '@dxos/echo';
import { registryLayer } from '@dxos/echo-client';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EdgeProcessManager } from '@dxos/edge-compute';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { Message } from '@dxos/types';

import { ChatModel } from './chat-model.ts';
import { providerForModel } from './presets.ts';
import { ChatModelRecorder } from './testing/chat-model-recorder.ts';
import { makeSpaceLayer, makeTestRuntime } from './testing/harness.ts';

/**
 * The chat model against an EDGE-hosted agent and a real model: the same indicator log as the scripted
 * suite, plus the latency of each stage of a turn, so a slow or silent hosted turn shows WHERE it is slow.
 *
 * The stack is the one Composer builds for a `remote` chat — the durable command queue in front of EDGE
 * process control, and the swarm monitor for the agent's live trace — so what this measures is what the
 * app sees.
 *
 * Run (one or more environments, comma-separated; `local` is `moon run edge:dev` in the edge repo):
 *   DX_RUN_MANUAL_TESTS=1 DX_EDGE_ENVS=local,dev moon run plugin-assistant:test -- src/chat-model/chat-model.edge.test.ts
 * Optional: DX_CHAT_MODEL (a model DXN; defaults to Claude Haiku 4.5), DX_CHAT_TURNS (prompts per chat).
 */

type EdgeEnv = 'local' | 'dev' | 'preview';

const ENVS = (process.env.DX_EDGE_ENVS ?? 'local').split(',').map((env) => env.trim()) as EdgeEnv[];
const MODEL = process.env.DX_CHAT_MODEL ? DXN.make(process.env.DX_CHAT_MODEL) : Model.claudeHaiku45.id;

const PROMPTS = [
  'Reply with exactly one word: pong',
  'Count from one to twenty in words, separated by commas.',
  'Now answer with one word: done',
].slice(0, Number.parseInt(process.env.DX_CHAT_TURNS ?? '3', 10));

/** The stages of a turn, each the first moment (ms after send) at which the reader could see it. */
type TurnTiming = {
  prompt: string;
  /** The chat reads as working (stop control, activity line). */
  active?: number;
  /** The agent process reports RUNNING (the host has taken the input). */
  agentRunning?: number;
  /** First phase the agent itself reported (anything past the client's own `starting`). */
  firstAgentPhase?: number;
  /** The provider was contacted. */
  contactingProvider?: number;
  /** First streamed content. */
  firstToken?: number;
  /** The prompt row ticks to read (the agent's queue took it). */
  promptRead?: number;
  /** The reply is in the thread from the feed (replicated back from EDGE). */
  replyInThread?: number;
  /** The chat reads idle again. */
  settled?: number;
  phases: string[];
  /** EDGE process-control calls made during the turn, as `verb start→end` (ms after send). */
  calls: string[];
};

/** EDGE process-control calls, timed, so a slow turn can be attributed to the round trip that made it slow. */
type EdgeCall = { verb: string; start: number; end?: number };

const PROCESS_VERBS = [
  'spawnProcess',
  'listProcesses',
  'getProcess',
  'submitProcessInput',
  'readProcessEvents',
  'terminateProcess',
] as const;

const traceEdgeCalls = (calls: EdgeCall[]) => {
  for (const verb of PROCESS_VERBS) {
    const original = EdgeHttpClient.prototype[verb];
    vi.spyOn(EdgeHttpClient.prototype, verb).mockImplementation(function (
      this: EdgeHttpClient,
      ...args: Parameters<typeof original>
    ) {
      const call: EdgeCall = { verb, start: performance.now() };
      calls.push(call);
      return (original as (...args: unknown[]) => Promise<unknown>).apply(this, args).finally(() => {
        call.end = performance.now();
      });
    } as typeof original);
  }
};

describe.each(ENVS)('ChatModel (edge-hosted agent, %s)', { tags: ['manual'], timeout: 600_000 }, (env) => {
  let client: Client;
  let space: Space;
  const calls: EdgeCall[] = [];

  beforeAll(async () => {
    client = await new Client({
      config: configPreset({ edge: env }),
      types: [Chat.Chat, Feed.Feed, Message.Message],
    }).initialize();
    await client.halo.createIdentity();
    space = await client.spaces.create();
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    traceEdgeCalls(calls);
  }, 120_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await client?.destroy();
  });

  test('every turn keeps its indicators up while the hosted agent works', async () => {
    const timings = await EffectEx.runPromise(
      runTurns(client, space, calls).pipe(Effect.provide(stack(client, space))),
    );

    console.log(`\nchat-model latency on ${env} (${DXN.getName(MODEL)}), ms after send:`);
    console.table(
      timings.map(({ phases: _phases, calls: _calls, prompt, ...stages }) => ({
        prompt: prompt.slice(0, 24),
        ...stages,
      })),
    );
    for (const timing of timings) {
      console.log(`  phases: ${timing.phases.join(' → ')}`);
      console.log(`  calls:  ${timing.calls.join(', ')}`);
    }
  });
});

const runTurns = (client: Client, space: Space, calls: EdgeCall[]) =>
  Effect.gen(function* () {
    const feed = yield* Database.add(Feed.make());
    // The model is the chat's own from the start: one stamped later reads as a reconfiguration, which
    // replaces the hosted process.
    const chat = yield* Database.add(
      Chat.make({ name: 'Latency', feed: Ref.make(feed), remote: true, session: { model: MODEL } }),
    );
    yield* Database.flush();
    // The hosted process reads the chat from EDGE's copy of the space.
    yield* Effect.promise(() => space.internal.syncToEdge());

    const runtime = yield* Effect.context<Database.Service>();
    const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
    const registry = yield* AtomRegistry.AtomRegistry;
    const chatModel = new ChatModel(session, yield* makeTestRuntime, feed, yield* makeSpaceLayer, {
      chat: Ref.make(chat),
      model: MODEL,
      provider: Provider.edge.id,
      observableRegistry: registry,
    });

    const timings: TurnTiming[] = [];
    for (const prompt of PROMPTS) {
      // Resolved per turn, with the chat model's own options: a hosted process that finished its turn is
      // replaced, and the replacement's status is the one to watch.
      const agent = yield* AgentService.getSession(chat, {
        provider: providerForModel(MODEL, Provider.edge.id),
        location: 'edge',
      });
      const recorder = new ChatModelRecorder(registry, chatModel, { agentRunning: agent.running });
      const turnRows = rows(recorder.state.thread);
      const sentAt = performance.now();
      const firstCall = calls.length;
      chatModel.send({ message: prompt });
      yield* Effect.promise(() => recorder.untilSettled(300_000));
      // The reply lands in the thread from the feed, which may trail the settle.
      yield* Effect.promise(() =>
        recorder.until((state) => rows(state.thread) >= turnRows + 2, 60_000).catch(() => undefined),
      );
      recorder.dispose();

      expect(recorder.state.error).toBe('-');
      // A hosted turn that streams nothing is the defect this suite exists for, not a slow turn.
      expect(recorder.firstAt('streaming', 'true')).toBeDefined();
      // Ignore the client's own idle reading before the first event of the turn.
      expect(recorder.violations.filter((violation) => violation.at > 0)).toEqual([]);
      timings.push({
        ...timingOf(prompt, recorder),
        calls: calls
          .slice(firstCall)
          .filter(({ verb }) => verb !== 'readProcessEvents' && verb !== 'getProcess')
          .map(({ verb, start, end }) => {
            const at = (time: number | undefined) => (time === undefined ? '…' : Math.round(time - sentAt));
            return `${verb.replace('Process', '')} ${at(start)}→${at(end)}`;
          }),
      });
    }
    return timings;
  }).pipe(Effect.scoped);

/** Rows in a recorded thread (the prompt and the reply each add one). */
const rows = (thread: string) => (thread === '-' ? 0 : thread.split(' | ').length);

const timingOf = (prompt: string, recorder: ChatModelRecorder): Omit<TurnTiming, 'calls'> => {
  const agentPhase = (value: string) => value !== '-' && value !== 'starting' && value !== 'generating';
  const threadRows = recorder.events.filter((event) => event.signal === 'thread');
  return {
    prompt,
    active: recorder.firstAt('active', 'true'),
    agentRunning: recorder.firstAt('agent', 'running'),
    firstAgentPhase: recorder.firstAt('activity', agentPhase),
    contactingProvider: recorder.firstAt('activity', (value) => value.startsWith('contacting-provider')),
    firstToken: recorder.firstAt('streaming', 'true'),
    promptRead: threadRows.find((event) => event.value.includes(`[read]:"${prompt.slice(0, 24)}`))?.at,
    replyInThread: threadRows.at(-1)?.at,
    settled: recorder.events.findLast((event) => event.signal === 'active' && event.value === 'false')?.at,
    phases: recorder.values('activity').filter((value) => value !== ''),
  };
};

/**
 * What Composer provides a `remote` chat: the local process manager, EDGE's behind the durable command
 * queue, the swarm-backed live trace, and `AgentService` over both.
 */
const stack = (client: Client, space: Space) =>
  Layer.empty.pipe(
    Layer.provideMerge(ProcessOperationInvoker.layer),
    Layer.provideMerge(AgentServiceRuntime.layer({ defaultModel: MODEL, provider: Provider.edge.id })),
    Layer.provideMerge(UnifiedProcessManager.layer),
    Layer.provideMerge(
      Layer.unwrap(
        Effect.gen(function* () {
          const kvStore = yield* KeyValueStore.KeyValueStore;
          return EdgeProcessManager.fromClient(client, { kvStore });
        }),
      ),
    ),
    Layer.provideMerge(Layer.succeed(RemoteTraceMonitor.Service, swarmMonitor(client))),
    Layer.provideMerge(ProcessManager.layer()),
    Layer.provideMerge(
      ServiceResolver.layerRequirements(
        Database.Service,
        OpaqueToolkit.OpaqueToolkitProvider,
        AiService.AiService,
        Registry.Service,
      ),
    ),
    Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.empty)),
    Layer.provideMerge(Trace.layerNoop),
    Layer.provideMerge(AiService.notAvailable),
    Layer.provideMerge(OpaqueToolkit.providerEmpty),
    Layer.provideMerge(configuredCredentialsLayer([])),
    Layer.provideMerge(registryLayer()),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(AtomRegistry.layer),
    Layer.provideMerge(Database.layer(space.db)),
  );

/** The swarm-backed live trace, as plugin-client contributes it. */
const swarmMonitor = (client: Client): RemoteTraceMonitor.Monitor =>
  RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
    subscribe: (tags) =>
      tags.length === 0
        ? Stream.empty
        : Stream.unwrap(
            Effect.sync(() => {
              const peer = { peerKey: toPublicKey(client.halo.device?.deviceKey)?.toHex() ?? '' };
              return client.services.rpc['NetworkService.subscribeMessages']({ peer, tags }).pipe(
                Stream.filterMap((message) =>
                  message.payload?.value
                    ? Result.succeed({ payload: message.payload.value, tags: message.tags })
                    : Result.failVoid,
                ),
                Stream.catch(() => Stream.empty),
              );
            }),
          ),
  });
