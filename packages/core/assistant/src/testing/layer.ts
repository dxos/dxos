//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';

import { AiService, type ModelName, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { GenericToolkit } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { Database, Feed, type Type } from '@dxos/echo';
import {
  CredentialsService,
  type FunctionInvocationService,
  QueueService,
  type ServiceCredential,
  TracingService,
} from '@dxos/functions';
import {
  ProcessManager,
  ServiceResolver,
  TracingServiceExt,
  TriggerDispatcher,
  TriggerStateStore,
  type Process,
} from '@dxos/functions-runtime';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { OperationHandlerSet, OperationRegistry } from '@dxos/operation';
import { ToolExecutionServices } from '../functions';
import { Blueprint } from '@dxos/blueprints';
import { AgentService } from '../service';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as LanguageModel from '@effect/ai/LanguageModel';

import type { TestContextService } from '@dxos/effect/testing';

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
  return Layer.empty.pipe(
    Layer.provideMerge(AgentService.layer({ systemPrompt })),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialProcessIdGenerator })),
    Layer.provideMerge(
      ServiceResolver.layerRequirements(
        Database.Service,
        GenericToolkit.GenericToolkitProvider,
        QueueService,
        AiService.AiService,
        OperationRegistry.Service,
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
