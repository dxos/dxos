//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';

import {
  AiService,
  ConsolePrinter,
  GenericToolkit,
  type ModelName,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { Database, DXN, Feed, Type } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import {
  CredentialsService,
  type FunctionInvocationService,
  QueueService,
  type ServiceCredential,
  ServiceNotAvailableError,
  Trace,
  TracingService,
} from '@dxos/functions';
import {
  Process,
  ProcessManager,
  ServiceResolver,
  TracingServiceExt,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions-runtime';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { Message } from '@dxos/types';

import { Blueprint, Prompt } from '@dxos/blueprints';
import { Operation, OperationHandlerSet, OperationRegistry } from '@dxos/operation';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { ToolExecutionServices } from '../functions';
import { AgentService } from '../service';

import type { TestContextService } from '@dxos/effect/testing';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import {
  AiContextBinder,
  AiContextService,
  AiConversation,
  AiConversationService,
  type ContextBinding,
} from '../conversation';
import * as Array from 'effect/Array';
import { CompleteBlock } from '../tracing';

interface TestLayerOptions {
  aiServicePreset?: 'direct' | 'edge-local' | 'edge-remote';
  model?: ModelName;
  operationHandlers?: OperationHandlerSet.OperationHandlerSet | OperationHandlerSet.OperationHandlerSet[];
  toolkits?: GenericToolkit.GenericToolkit[];
  types?: Type.AnyEntity[];
  blueprints?: Blueprint.Blueprint[];
  credentials?: ServiceCredential[];
  /*
   * Tracing configuration.
   * @default 'noop'
   */
  tracing?: 'noop' | 'console' | 'pretty';

  disableLlmMemoization?: boolean;

  /**
   * Core system prompt for the agent.
   */
  systemPrompt?: string;
}

export type AssistantTestServices =
  // Convinience
  | LanguageModel.LanguageModel
  | Feed.Service
  | CredentialsService
  | AgentService.AgentService
  | AiService.AiService
  | Database.Service
  | QueueService
  // Registries
  | Blueprint.RegistryService
  | OperationRegistry.Service
  | GenericToolkit.GenericToolkitProvider
  // Core
  | ProcessManager.ProcessManagerService
  | Process.ProcessMonitorService
  | Registry.AtomRegistry
  // Should those be here?
  | OperationHandlerSet.OperationHandlerProvider
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | TracingService
  | Trace.TraceService
  | Trace.TraceSink
  // Deperacted
  | ToolExecutionService
  | ToolResolverService
  | FunctionInvocationService;

export const AssistantTestLayer = ({
  aiServicePreset = 'direct',
  model = '@anthropic/claude-opus-4-6',
  operationHandlers = [],
  toolkits = [],
  types = [],
  credentials = [],
  tracing = 'noop',
  disableLlmMemoization = false,
  blueprints = [],
  systemPrompt,
}: TestLayerOptions = {}): Layer.Layer<AssistantTestServices, never, TestContextService> => {
  const toolkit = GenericToolkit.merge(...toolkits);
  const operationHandlersSet = Array.isArray(operationHandlers)
    ? OperationHandlerSet.merge(...operationHandlers)
    : operationHandlers;
  types.push(Blueprint.Blueprint, Prompt.Prompt, Operation.PersistentOperation, Feed.Feed);
  types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

  return Layer.empty.pipe(
    Layer.provideMerge(Trace.testTraceService({ meta: { processName: 'test' } })),
    Layer.provideMerge(AgentService.layer({ systemPrompt })),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialProcessIdGenerator })),
    Layer.provideMerge(
      // TODO(dmaretskyi): Refactor to be able to merge resovler layers, also consider service mesh achitecture.
      Layer.effect(
        ServiceResolver.ServiceResolver,
        Effect.gen(function* () {
          const services = yield* Effect.context<Database.Service | QueueService>().pipe(
            Effect.map(Context.pick(Database.Service, QueueService)),
            Effect.map(Layer.succeedContext),
          );
          // AiContextBinder.
          return ServiceResolver.compose(
            ServiceResolver.succeed(AiContextService, (context) =>
              Effect.gen(function* () {
                if (!context.conversation) {
                  return yield* Effect.fail(new ServiceNotAvailableError(AiContextService.key));
                }
                const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
                const queue = yield* QueueService.getQueue(Feed.getQueueDxn(feed)!);
                const binder = yield* acquireReleaseResource(
                  () =>
                    new AiContextBinder({
                      queue,
                    }),
                );
                return { binder };
              }).pipe(Effect.provide(services)),
            ),
            // AiConversationService.
            ServiceResolver.succeed(AiConversationService, (context) =>
              Effect.gen(function* () {
                if (!context.conversation) {
                  return yield* Effect.fail(new ServiceNotAvailableError(AiContextService.key));
                }
                const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
                const queue = yield* QueueService.getQueue<ContextBinding | Message.Message>(Feed.getQueueDxn(feed)!);
                const conversation = yield* acquireReleaseResource(
                  () =>
                    new AiConversation({
                      queue,
                    }),
                );
                return conversation;
              }).pipe(Effect.provide(services)),
            ),
            yield* ServiceResolver.fromRequirements(
              Database.Service,
              GenericToolkit.GenericToolkitProvider,
              QueueService,
              AiService.AiService,
              OperationRegistry.Service,
              Blueprint.RegistryService,
            ),
          );
        }),
      ),
    ),
    Layer.provideMerge(Layer.mergeAll(OperationRegistry.layer, AiService.model(model), ToolExecutionServices)),
    Layer.provideMerge(
      FunctionInvocationServiceLayerTest({
        functions: operationHandlersSet,
      }),
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        TestAiService({ preset: aiServicePreset, disableMemoization: disableLlmMemoization }),
        TestDatabaseLayer({
          spaceKey: 'fixed',
          types,
        }),
        CredentialsService.configuredLayer(credentials),
        Feed.notAvailable,
        Match.value(tracing).pipe(
          Match.when('noop', () => TracingService.layerNoop),
          Match.when('console', () => TracingServiceExt.layerLogInfo()),
          Match.when('pretty', () =>
            TracingServiceExt.layerConsolePrettyPrint({
              toolkit: (toolkits.length > 0 ? GenericToolkit.merge(...toolkits) : GenericToolkit.empty).toolkit as any,
            }),
          ),
          Match.exhaustive,
        ),
        Match.value(tracing).pipe(
          Match.when('noop', () => Trace.layerNoop),
          Match.when('console', () => Trace.layerConsole),
          Match.when('pretty', () => TraceSinkPretty()),
          Match.exhaustive,
        ),
      ),
    ),
    Layer.provideMerge(Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry(blueprints))),
    Layer.provideMerge(GenericToolkit.providerLayer(toolkit)),
    Layer.provideMerge(OperationHandlerSet.provide(operationHandlersSet)),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(Registry.layer),
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
      Layer.provide(Registry.layer),
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
