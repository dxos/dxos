//
// Copyright 2026 DXOS.org
//

import { Registry as AtomRegistry } from '@effect-atom/atom';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';

import { AiService, ConsolePrinter, OpaqueToolkit, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { AiContext, AiSession, CompleteBlock } from '@dxos/assistant';
import {
  Blueprint,
  Credential,
  Operation,
  OperationHandlerSet,
  OperationRegistry,
  Process,
  Routine,
  ServiceNotAvailableError,
  ServiceResolver,
  Trace,
  Trigger,
} from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import { Database, Feed, Registry, Tag, Type } from '@dxos/echo';
import { registryLayer } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { type TestContextService } from '@dxos/effect/testing';
import { configuredCredentialsLayer } from '@dxos/functions';

import { AgentService } from '../agent-service';
import * as FeedTraceSink from '../FeedTraceSink';
import { TriggerDispatcher, TriggerStateStore } from '../triggers';

interface TestLayerOptions {
  aiServicePreset?: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';
  model?: ModelName;
  operationHandlers?: OperationHandlerSet.OperationHandlerSet | OperationHandlerSet.OperationHandlerSet[];
  toolkits?: OpaqueToolkit.OpaqueToolkit[];
  types?: Type.AnyEntity[];
  blueprints?: Blueprint.Blueprint[];
  credentials?: Credential.ServiceCredential[];

  /**
   * Tracing configuration.
   * - `'feed'` persists trace events to a FeedTraceSink (queryable from the database).
   * @default 'noop'
   */
  tracing?: 'noop' | 'console' | 'pretty' | 'feed';

  disableLlmMemoization?: boolean;

  /**
   * Core system prompt for the agent.
   */
  systemPrompt?: string;

  /**
   * If true, long-running tool calls are moved to the background and the agent is notified
   * asynchronously when they complete. Currently unstable — disabled by default.
   *
   * @default false
   */
  enableToolBackgrounding?: boolean;
}

export type AssistantTestServices =
  | LanguageModel.LanguageModel
  | Feed.FeedService
  | Credential.CredentialsService
  | AgentService.AgentService
  | AiService.AiService
  | Database.Service
  | Registry.Service
  | OperationRegistry.Service
  | OpaqueToolkit.OpaqueToolkitProvider
  | Operation.Service
  | ProcessManager.Service
  | Process.ProcessMonitorService
  | AtomRegistry.AtomRegistry
  | OperationHandlerSet.OperationHandlerProvider
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | Trace.TraceService
  | Trace.TraceSink
  | FeedTraceSink.FeedTraceSink;

export const AssistantTestLayer = ({
  aiServicePreset = 'direct',
  model,
  operationHandlers = [],
  toolkits = [],
  types = [],
  credentials = [],
  tracing = 'noop',
  disableLlmMemoization = false,
  blueprints = [],
  systemPrompt,
  enableToolBackgrounding = false,
}: TestLayerOptions = {}): Layer.Layer<AssistantTestServices, never, TestContextService> => {
  const resolvedModel: ModelName =
    model ?? (aiServicePreset === 'ollama' ? 'ai.ollama.model.gpt-oss:20b' : 'ai.claude.model.claude-opus-4-6');
  const toolkit = OpaqueToolkit.merge(...toolkits);
  const operationHandlersSet = Array.isArray(operationHandlers)
    ? OperationHandlerSet.merge(...operationHandlers)
    : operationHandlers;
  types.push(Blueprint.Blueprint, Routine.Routine, Operation.PersistentOperation, Feed.Feed, Trigger.Trigger, Tag.Tag);
  types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

  return Layer.empty.pipe(
    Layer.provideMerge(ProcessManager.ProcessOperationInvoker.layer),
    Layer.provideMerge(Trace.testTraceService({ meta: { processName: 'test' } })),
    Layer.provideMerge(AgentService.layer({ systemPrompt, model: resolvedModel, enableToolBackgrounding })),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(
      Layer.effect(
        ServiceResolver.ServiceResolver,
        Effect.gen(function* () {
          const services = yield* Effect.context<Database.Service | Feed.FeedService>().pipe(
            Effect.map(Context.pick(Database.Service, Feed.FeedService)),
            Effect.map(Layer.succeedContext),
          );
          return ServiceResolver.compose(
            ServiceResolver.succeed(AiContext.Service, (context) =>
              Effect.gen(function* () {
                if (!context.conversation) {
                  return yield* Effect.fail(new ServiceNotAvailableError(AiContext.Service.key));
                }
                const feed = yield* Database.resolve(context.conversation, Feed.Feed).pipe(Effect.orDie);
                const runtime = yield* Effect.runtime<Feed.FeedService>();
                const binder = yield* acquireReleaseResource(
                  () =>
                    new AiContext.Binder({
                      feed,
                      runtime,
                    }),
                );
                return { binder };
              }).pipe(Effect.provide(services)),
            ),
            ServiceResolver.succeed(AiSession.Service, (context) =>
              Effect.gen(function* () {
                if (!context.conversation) {
                  return yield* Effect.fail(new ServiceNotAvailableError(AiSession.Service.key));
                }
                const feed = yield* Database.resolve(context.conversation, Feed.Feed).pipe(Effect.orDie);
                const runtime = yield* Effect.runtime<Feed.FeedService>();
                const session = yield* acquireReleaseResource(
                  () =>
                    new AiSession.Session({
                      feed,
                      runtime,
                    }),
                );
                return session;
              }).pipe(Effect.provide(services)),
            ),
            yield* ServiceResolver.fromRequirements(
              Database.Service,
              OpaqueToolkit.OpaqueToolkitProvider,
              Feed.FeedService,
              AiService.AiService,
              OperationRegistry.Service,
              Registry.Service,
              Credential.CredentialsService,
            ),
          );
        }),
      ),
    ),
    Layer.provideMerge(Layer.mergeAll(OperationRegistry.layer, AiService.model(resolvedModel))),
    Layer.provideMerge(
      Match.value(tracing).pipe(
        Match.when('noop', () => Layer.mergeAll(Trace.layerNoop, FeedTraceSink.layerNoop)),
        Match.when('console', () => Layer.mergeAll(Trace.layerConsole, FeedTraceSink.layerNoop)),
        Match.when('pretty', () => Layer.mergeAll(TraceSinkPretty(), FeedTraceSink.layerNoop)),
        Match.when('feed', () => FeedTraceSink.layerLiveWithDirectSink),
        Match.exhaustive,
      ) as Layer.Layer<Trace.TraceSink | FeedTraceSink.FeedTraceSink>,
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        TestAiService({ preset: aiServicePreset, disableMemoization: disableLlmMemoization }),
        TestDatabaseLayer({
          spaceKey: 'fixed',
          types,
        }),
        configuredCredentialsLayer(credentials),
      ),
    ),
    Layer.provideMerge(registryLayer({ initial: blueprints })),
    Layer.provideMerge(OpaqueToolkit.providerLayer(toolkit)),
    Layer.provideMerge(OperationHandlerSet.provide(operationHandlersSet)),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(AtomRegistry.layer),
    Layer.orDie,
  );
};

interface TestLayerWithTriggersOptions extends TestLayerOptions {}

export type AssistantTestServicesWithTriggers = AssistantTestServices | TriggerDispatcher | TriggerStateStore;

export const AssistantTestLayerWithTriggers = (
  options: TestLayerWithTriggersOptions,
): Layer.Layer<AssistantTestServicesWithTriggers, never, TestContextService> =>
  Layer.mergeAll(
    AssistantTestLayer(options),
    TriggerDispatcher.layer({ timeControl: 'manual', startingTime: new Date('2025-09-05T15:01:00.000Z') }).pipe(
      Layer.provide(AtomRegistry.layer),
    ),
    TriggerStateStore.layerMemory,
  ) as any;

const TraceSinkPretty = () =>
  Layer.succeed(Trace.TraceSink, {
    write: (message) => {
      for (const event of message.events) {
        if (Trace.isOfType(CompleteBlock, event)) {
          const tag = message.meta.processName ?? `[${message.meta.pid ?? 'unknown'}]`;
          console.log(`[${tag}] ${event.data.role.toUpperCase()}`);
          new ConsolePrinter({ tag }).printContentBlock(event.data.block);
        } else if (Trace.isOfType(Process.SpawnedEvent, event)) {
          console.log(`[${message.meta.pid}] Process spawned: ${message.meta.processName}`);
        } else if (Trace.isOfType(Process.ExitedEvent, event)) {
          console.log(`[${message.meta.pid}] Process exited: ${event.data.outcome}`);
        }
      }
    },
  });
