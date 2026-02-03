//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';

import { AiService, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import type { Type } from '@dxos/echo';
import { CredentialsService, type FunctionDefinition, type ServiceCredential, TracingService } from '@dxos/functions';
import { TracingServiceExt, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '../functions';
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
}

export const AssistantTestLayer = ({
  aiServicePreset = 'direct',
  model = '@anthropic/claude-opus-4-0',
  functions = [],
  toolkits = [],
  types = [],
  credentials = [],
  tracing = 'noop',
}: TestLayerOptions) =>
  Layer.mergeAll(
    AiService.model(model),
    makeToolResolverFromFunctions(functions, GenericToolkit.merge(...toolkits).toolkit as any),
    makeToolExecutionServiceFromFunctions(
      GenericToolkit.merge(...toolkits).toolkit as any,
      GenericToolkit.merge(...toolkits).layer as any,
    ),
  ).pipe(
    Layer.provideMerge(
      FunctionInvocationServiceLayerTest({
        functions,
      }),
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        TestAiService({ preset: aiServicePreset }),
        TestDatabaseLayer({
          spaceKey: 'fixed',
          types,
        }),
        CredentialsService.configuredLayer(credentials),
        Match.value(tracing).pipe(
          Match.when('noop', () => TracingService.layerNoop),
          Match.when('console', () => TracingServiceExt.layerLogInfo()),
          Match.when('pretty', () => TracingServiceExt.layerConsolePrettyPrint()),
          Match.exhaustive,
        ),
      ),
    ),
  );

interface TestLayerWithTriggersOptions extends TestLayerOptions {}

export const AssistantTestLayerWithTriggers = (options: TestLayerWithTriggersOptions) =>
  Layer.mergeAll(
    AssistantTestLayer(options),
    TriggerDispatcher.layer({ timeControl: 'manual', startingTime: new Date('2025-09-05T15:01:00.000Z') }).pipe(
      Layer.provide(Registry.layer),
    ),
  ).pipe(Layer.provideMerge(TriggerStateStore.layerMemory));
