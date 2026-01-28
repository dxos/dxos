//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { AiService, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import type { Type } from '@dxos/echo';
import { CredentialsService, type FunctionDefinition, type ServiceCredential, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '../functions';
import { GenericToolkit } from '../session';
import { TracingServiceExt } from '@dxos/functions-runtime';

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
  tracing?: 'noop' | 'console';
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
        tracing === 'noop' ? TracingService.layerNoop : TracingServiceExt.layerLogInfo(),
      ),
    ),
  );
