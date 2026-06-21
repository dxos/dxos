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

import { AiService, OpaqueToolkit, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { AiContext, AiSession } from '@dxos/assistant';
import {
  AgentService,
  Blueprint,
  Credential,
  Operation,
  OperationHandlerSet,
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
import { registryLayer } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { type TestContextService } from '@dxos/effect/testing';
import { configuredCredentialsLayer } from '@dxos/functions';

import { AgentService as AgentServiceRuntime } from '../agent-service';
import * as FeedTraceSink from '../FeedTraceSink';
import { TriggerDispatcher, TriggerStateStore } from '../triggers';
import { traceSinkPrettyLayer } from './trace-pretty-print';

interface TestLayerOptions {
  aiServicePreset?: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';

  /**
   * Overrides the AI service entirely (e.g. a scripted model for deterministic e2e tests).
   * When set, `aiServicePreset` and `disableLlmMemoization` are ignored.
   */
  aiService?: Layer.Layer<AiService.AiService>;
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
   * Patterns matching run-specific values (e.g. timestamps derived from TestClock) that should be
   * canonicalized for memoized-conversation matching. Forwarded to `TestAiService`. Opt-in.
   */
  dynamicValuePatterns?: readonly RegExp[];

  /**
   * Options for the agent process (system prompt, tool backgrounding, delegation strategy, etc.).
   * The model defaults to the resolved test-layer model when not set here.
   */
  agent?: AgentServiceRuntime.AgentServiceOptions;

  /**
   * Extra services to make available in the service resolver.
   * Operations can depend on those services.
   */
  extraServices?: Layer.Layer<never, never, never>;
}

export type AssistantTestServices =
  | LanguageModel.LanguageModel
  | Credential.CredentialsService
  | AgentService.AgentService
  | AiService.AiService
  | Database.Service
  | Registry.Service
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

export const AssistantTestLayer = (
  options: TestLayerOptions = {},
): Layer.Layer<AssistantTestServices, never, TestContextService> => {
  const resolvedModel: ModelName =
    options.model ??
    (options.aiServicePreset === 'ollama' ? 'ai.ollama.model.gpt-oss:20b' : 'ai.claude.model.claude-opus-4-6');

  const agentOptions: AgentServiceRuntime.AgentServiceOptions = { ...options.agent };
  agentOptions.model ??= resolvedModel;

  return Layer.empty.pipe(
    Layer.provideMerge(ProcessManager.ProcessOperationInvoker.layer),
    Layer.provideMerge(AgentServiceRuntime.layer(agentOptions)),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(Trace.testTraceService({ meta: { processName: 'test' } })),
    Layer.provideMerge(AssistantTestServiceResolverLayer(options)),
    Layer.provideMerge(AiService.model(resolvedModel)),
    Layer.provideMerge(AssistantTestTracingLayer(options.tracing ?? 'noop')),
    Layer.provideMerge(
      options.aiService ??
        TestAiService({
          preset: options.aiServicePreset,
          disableMemoization: options.disableLlmMemoization,
          dynamicValuePatterns: options.dynamicValuePatterns,
        }),
    ),
    Layer.provideMerge(AssistantTestBaseLayer(options)),
    Layer.orDie,
  );
};

/**
 * Service resolver for testing.
 */
export const AssistantTestServiceResolverLayer = ({
  extraServices = Layer.empty,
}: Pick<TestLayerOptions, 'extraServices'>) =>
  Layer.scoped(
    ServiceResolver.ServiceResolver,
    Effect.gen(function* () {
      const services = yield* Effect.context<Database.Service>().pipe(
        Effect.map(Context.pick(Database.Service)),
        Effect.map(Layer.succeedContext),
      );

      const extraServicesRt = yield* Layer.toRuntime(extraServices);

      return ServiceResolver.compose(
        ServiceResolver.succeed(AiContext.Service, (context) =>
          Effect.gen(function* () {
            if (!context.conversation) {
              return yield* Effect.fail(new ServiceNotAvailableError(AiContext.Service.key));
            }
            const feed = yield* Database.resolve(context.conversation, Feed.Feed).pipe(Effect.orDie);
            const runtime = yield* Effect.runtime<Database.Service>();
            const binder = yield* EffectEx.acquireReleaseResource(
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
            const runtime = yield* Effect.runtime<Database.Service>();
            const session = yield* EffectEx.acquireReleaseResource(
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
          AiService.AiService,
          Registry.Service,
          Credential.CredentialsService,
        ),
        ServiceResolver.fromContext(extraServicesRt.context),
      );
    }),
  );

/**
 * Only storage + registry.
 */
export const AssistantTestBaseLayer = ({
  operationHandlers = [],
  toolkits = [],
  types = [],
  credentials = [],
  blueprints = [],
}: Pick<TestLayerOptions, 'operationHandlers' | 'toolkits' | 'types' | 'blueprints' | 'tracing' | 'credentials'>) => {
  const toolkit = OpaqueToolkit.merge(...toolkits);
  const operationHandlersSet = Array.isArray(operationHandlers)
    ? OperationHandlerSet.merge(...operationHandlers)
    : operationHandlers;
  types.push(Blueprint.Blueprint, Routine.Routine, Operation.PersistentOperation, Feed.Feed, Trigger.Trigger, Tag.Tag);
  types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

  return Layer.empty.pipe(
    Layer.provideMerge(
      TestDatabaseLayer({
        spaceKey: 'fixed',
        types,
      }),
    ),
    Layer.provideMerge(configuredCredentialsLayer(credentials)),
    Layer.provideMerge(
      Layer.effect(
        Registry.Service,
        Effect.gen(function* () {
          const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
          const registry = yield* Registry.Service;
          const handlers = yield* handlerSet.handlers;
          registry.add(handlers.map(Operation.serialize));
          return registry;
        }),
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

const AssistantTestTracingLayer = (
  mode: 'noop' | 'console' | 'pretty' | 'feed',
): Layer.Layer<FeedTraceSink.FeedTraceSink | Trace.TraceSink, never, Database.Service> =>
  Match.value(mode).pipe(
    Match.when('noop', () => Layer.mergeAll(Trace.layerNoop, FeedTraceSink.layerNoop)),
    Match.when('console', () => Layer.mergeAll(Trace.layerConsole, FeedTraceSink.layerNoop)),
    Match.when('pretty', () => Layer.mergeAll(traceSinkPrettyLayer(), FeedTraceSink.layerNoop)),
    Match.when('feed', () => FeedTraceSink.layerLiveWithDirectSink),
    Match.exhaustive,
  );

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

