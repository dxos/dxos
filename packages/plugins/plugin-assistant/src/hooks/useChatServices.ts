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
import { type Assistant } from '../types';

export type AiChatServices =
  | CredentialsService
  | DatabaseService
  | QueueService
  | RemoteFunctionExecutionService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type UseChatServicesProps = {
  space?: Space;
  chat?: Assistant.Chat;
};

/**
 * Construct service layer.
 */
export const useChatServices = ({ space, chat }: UseChatServicesProps): Layer.Layer<AiChatServices> | undefined => {
  const serviceLayer = useCapabilities(AssistantCapabilities.AiServiceLayer).at(0) ?? Layer.die('AiService not found');
  const functions = useCapabilities(Capabilities.Functions);
  const toolkits = useCapabilities(Capabilities.Toolkit);
  const handlers = useCapabilities(Capabilities.ToolkitHandler);

  return useMemo(() => {
    const allFunctions = functions.flat();
    // TODO(wittjosiah): Don't cast.
    const toolkit = AiToolkit.merge(...toolkits) as AiToolkit.Any as AiToolkit.AiToolkit<AiTool.Any>;
    const handlersLayer = Layer.mergeAll(Layer.empty, ...handlers);

    return Layer.mergeAll(
      serviceLayer,
      makeToolResolverFromFunctions(allFunctions, toolkit),
      makeToolExecutionServiceFromFunctions(allFunctions, toolkit, handlersLayer),
      CredentialsService.layerFromDatabase(),
      ComputeEventLogger.layerFromTracing,
    ).pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable,
          space ? QueueService.layer(space.queues) : QueueService.notAvailable,
          chat?.traceQueue?.target ? TracingService.layerQueue(chat.traceQueue?.target) : TracingService.layerNoop,
          LocalFunctionExecutionService.layer,
          RemoteFunctionExecutionService.mockLayer,
        ),
      ),
    );
  }, [space, functions, toolkits, handlers, chat?.traceQueue?.target]);
};
