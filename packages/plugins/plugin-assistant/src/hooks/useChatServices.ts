//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Layer } from 'effect';
import { useMemo } from 'react';

import { type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
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

import { AssistantCapabilities } from '../capabilities';

// TODO(burdon): Deconstruct into separate layers?
export type AiChatServices =
  | AiService.AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | RemoteFunctionExecutionService
  | ToolResolverService
  | ToolExecutionService
  | TracingService;

export type UseChatServicesProps = {
  space?: Space;
};

/**
 * Construct service layer.
 */
export const useChatServices = ({ space }: UseChatServicesProps): Layer.Layer<AiChatServices> | undefined => {
  const aiServiceLayer =
    useCapabilities(AssistantCapabilities.AiServiceLayer).at(0) ?? Layer.die('AiService not found');
  const functions = useCapabilities(Capabilities.Functions);
  const toolkits = useCapabilities(Capabilities.Toolkit);
  const handlers = useCapabilities(Capabilities.ToolkitHandler);

  return useMemo(() => {
    const allFunctions = functions.flat();
    // TODO(wittjosiah): Don't cast.
    const toolkit = AiToolkit.merge(...toolkits) as AiToolkit.Any as AiToolkit.AiToolkit<AiTool.Any>;
    const handlersLayer = Layer.mergeAll(Layer.empty, ...handlers);
    return Layer.mergeAll(
      aiServiceLayer,
      makeToolResolverFromFunctions(allFunctions, toolkit),
      makeToolExecutionServiceFromFunctions(allFunctions, toolkit, handlersLayer),
      CredentialsService.layerFromDatabase(),
      ComputeEventLogger.layerFromTracing,
    ).pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable,
          space ? QueueService.layer(space.queues) : QueueService.notAvailable,
          TracingService.layerNoop,
          LocalFunctionExecutionService.layer,
          RemoteFunctionExecutionService.mockLayer,
        ),
      ),
    );
  }, [space, functions, toolkits, handlers]);
};
