//
// Copyright 2025 DXOS.org
//

import { Layer } from 'effect';
import { useMemo } from 'react';
import { useDeepCompareMemoize } from 'use-deep-compare-effect';

import { type AiService, ToolExecutionService, ToolRegistry, ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import {
  ConfiguredCredentialsService,
  CredentialsService,
  DatabaseService,
  EventLogger,
  FunctionCallService,
  ToolResolverService as FunctionsToolResolverService,
  QueueService,
  TracingService,
} from '@dxos/functions';

import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
export * from '@dxos/assistant';

// TODO(burdon): Deconstruct into separate layers?
export type ChatServices =
  | AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | FunctionCallService
  | ToolResolverService
  | TracingService
  | EventLogger
  | ToolResolverService
  | ToolExecutionService;

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
      AiServiceTestingPreset('direct').pipe(Layer.orDie), // TODO(burdon): Error management?
      Layer.succeed(CredentialsService, new ConfiguredCredentialsService()),
      space ? Layer.succeed(DatabaseService, DatabaseService.make(space.db)) : DatabaseService.notAvailable,
      space ? Layer.succeed(QueueService, QueueService.make(space.queues)) : QueueService.notAvailable,
      Layer.succeed(FunctionCallService, FunctionCallService.mock()),
      Layer.succeed(TracingService, TracingService.noop),
      Layer.succeed(EventLogger, EventLogger.noop),
      toolResolver,
      toolExecutionService,
      // TODO(dmaretskyi): Remove.
      Layer.succeed(FunctionsToolResolverService, FunctionsToolResolverService.make(toolRegistry)),
    );
  }, [space, toolRegistry, toolResolver]);
};

const useToolResolver = (): Layer.Layer<ToolResolverService> => {
  const functions = useCapabilities(Capabilities.Functions).flat();
  return useMemo(() => makeToolResolverFromFunctions(functions), [useDeepCompareMemoize(functions.map((f) => f.name))]);
};

const useToolExecutionService = (): Layer.Layer<ToolExecutionService> => {
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
