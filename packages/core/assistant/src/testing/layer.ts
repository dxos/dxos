import { CredentialsService, TracingService, type FunctionDefinition, type ServiceCredential } from '@dxos/functions';
import * as Layer from 'effect/Layer';
import { GenericToolkit } from '../session';
import { AiService, type ModelName } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import type { Type } from '@dxos/echo';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '../functions';

interface TestLayerOptions {
  aiServicePreset?: 'direct' | 'edge-local' | 'edge-remote';
  model?: ModelName;
  functions?: FunctionDefinition.Any[];
  toolkits?: GenericToolkit.GenericToolkit[];
  types?: Type.Entity.Any[];
  credentials?: ServiceCredential[];
}

export const AssistantTestLayer = ({
  aiServicePreset = 'direct',
  model = '@anthropic/claude-opus-4-0',
  functions = [],
  toolkits = [],
  types = [],
  credentials = [],
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
        TracingService.layerNoop,
      ),
    ),
  );
