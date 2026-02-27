//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';

import { AiService, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { Feed, type Type } from '@dxos/echo';
import { CredentialsService, type FunctionDefinition, type ServiceCredential, TracingService } from '@dxos/functions';
import { TracingServiceExt, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { ToolExecutionServices } from '../functions';
import { GenericToolkit } from '../session';

interface TestLayerOptions {
  aiServicePreset?: 'direct' | 'edge-local' | 'edge-remote';
  model?: ModelName;
  functions?: FunctionDefinition.Any[];
  toolkits?: GenericToolkit.GenericToolkit[];
  types?: Type.Entity.Any[];
  credentials?: ServiceCredential[];
  /*
   * Tracing configuration.
   * @default 'noop'
   */
  tracing?: 'noop' | 'console' | 'pretty';

  disableLlmMemoization?: boolean;
}

export const AssistantTestLayer = ({
  aiServicePreset = 'direct',
  model = '@anthropic/claude-opus-4-0',
  functions = [],
  toolkits = [],
  types = [],
  credentials = [],
  tracing = 'noop',
  disableLlmMemoization = false,
}: TestLayerOptions = {}) => {
  const toolkit = GenericToolkit.merge(...toolkits);
  return Layer.mergeAll(AiService.model(model), ToolExecutionServices).pipe(
    Layer.provideMerge(
      FunctionInvocationServiceLayerTest({
        functions,
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
    Layer.provideMerge(GenericToolkit.providerLayer(toolkit)),
  );
};

interface TestLayerWithTriggersOptions extends TestLayerOptions {}

export const AssistantTestLayerWithTriggers = (options: TestLayerWithTriggersOptions) =>
  Layer.mergeAll(
    AssistantTestLayer(options),
    TriggerDispatcher.layer({ timeControl: 'manual', startingTime: new Date('2025-09-05T15:01:00.000Z') }).pipe(
      Layer.provide(Registry.layer),
    ),
  ).pipe(Layer.provideMerge(TriggerStateStore.layerMemory));
