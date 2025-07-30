//
// Copyright 2025 DXOS.org
//

import { Layer } from 'effect';
import { useMemo } from 'react';
import { useDeepCompareMemoize } from 'use-deep-compare-effect';

import { type AiService, type ToolExecutionService, ToolRegistry, type ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';

export * from '@dxos/assistant';

// TODO(burdon): Deconstruct into separate layers?
export type ChatServices =
  | AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | RemoteFunctionExecutionService
  | ToolResolverService
  | ToolExecutionService
  | TracingService
  | ComputeEventLogger;

export type UseChatServicesProps = {
  space?: Space;
};

/**
 * Construct service layer.
 */
export const useChatServices = ({ space }: UseChatServicesProps): Layer.Layer<ChatServices> | undefined => {
  const toolRegistry = useToolRegistry();
  // TODO(dmaretskyi): We can provide the plugin registry as a layer and then build the entire layer stack from there. We need to think how plugin reactivity affect our layer structure.
  const toolResolver = useToolResolver();
  const toolExecutionService = useToolExecutionService();

  return useMemo(() => {
    return Layer.mergeAll(
      AiServiceTestingPreset('edge-remote').pipe(Layer.orDie), // TODO(burdon): Error management?
      CredentialsService.configuredLayer([]),
      space ? DatabaseService.makeLayer(space.db) : DatabaseService.notAvailable,
      space ? QueueService.makeLayer(space.queues) : QueueService.notAvailable,
      RemoteFunctionExecutionService.mockLayer,
      ComputeEventLogger.layerFromTracing,
      toolResolver,
      toolExecutionService,
    ).pipe(Layer.provideMerge(TracingService.layerNoop), Layer.provideMerge(LocalFunctionExecutionService.layer));
  }, [space, toolRegistry, toolResolver]);
};

const useToolResolver = (): Layer.Layer<ToolResolverService> => {
  const functions = useCapabilities(Capabilities.Functions).flat();
  return useMemo(() => makeToolResolverFromFunctions(functions), [useDeepCompareMemoize(functions.map((f) => f.name))]);
};

const useToolExecutionService = (): Layer.Layer<ToolExecutionService, never, LocalFunctionExecutionService> => {
  const functions = useCapabilities(Capabilities.Functions).flat();
  return useMemo(
    () => makeToolExecutionServiceFromFunctions(functions),
    [useDeepCompareMemoize(functions.map((f) => f.name))],
  );
};

// TODO(burdon): Factor out.
const useToolRegistry = (): ToolRegistry => {
  const tools = useCapabilities(Capabilities.Tools).flat();
  return useMemo(() => {
    const toolRegistry = new ToolRegistry([]);
    for (const tool of tools) {
      if (!toolRegistry.has(tool)) {
        toolRegistry.register(tool);
      }
    }
    return toolRegistry;
  }, [useDeepCompareMemoize(tools)]);
};
