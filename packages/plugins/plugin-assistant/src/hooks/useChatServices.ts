//
// Copyright 2025 DXOS.org
//

import { Layer } from 'effect';
import { useMemo } from 'react';
import { useDeepCompareMemoize } from 'use-deep-compare-effect';

import { type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { Capabilities, useCapabilities, useCapabilityLayer } from '@dxos/app-framework';
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
  const aiServiceLayer = useCapabilityLayer(AssistantCapabilities.AiServiceLayer);
  const functions = useCapabilities(Capabilities.Functions).flat();

  return useMemo(() => {
    return Layer.mergeAll(
      aiServiceLayer,
      makeToolResolverFromFunctions(functions),
      makeToolExecutionServiceFromFunctions(functions),

      CredentialsService.configuredLayer([]),
      space ? DatabaseService.makeLayer(space.db) : DatabaseService.notAvailable,
      space ? QueueService.makeLayer(space.queues) : QueueService.notAvailable,

      ComputeEventLogger.layerFromTracing,
    ).pipe(
      Layer.provideMerge(TracingService.layerNoop),
      Layer.provideMerge(LocalFunctionExecutionService.layer),
      Layer.provideMerge(RemoteFunctionExecutionService.mockLayer),
    );
  }, [space, useDeepCompareMemoize(functions.map((f) => f.name))]);
};
