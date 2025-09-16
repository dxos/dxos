//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Layer, Runtime, Effect } from 'effect';
import { useMemo } from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
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
import { type AiChatServices } from '../processor';
import { type Assistant } from '../types';
import { useClient } from '@dxos/react-client';

export type UseChatServicesProps = {
  space?: Space;
  chat?: Assistant.Chat;
};

/**
 * Construct service layer.
 */
// TODO(dmaretskyi): Better return type.
export const useChatServices = ({
  space,
  chat,
}: UseChatServicesProps): (() => Promise<Runtime.Runtime<AiChatServices>>) | undefined => {
  const client = useClient();
  space ??= client.spaces.default;

  const computeRuntimeResolver = useCapability(AssistantCapabilities.ComputeRuntime);

  return useMemo(() => {
    const runtime = computeRuntimeResolver.getRuntime(space.id);
    return () =>
      runtime.runPromise(
        Effect.gen(function* () {
          return yield* Effect.runtime<AiChatServices>().pipe(
            Effect.provide(
              chat?.traceQueue?.target ? TracingService.layerQueue(chat.traceQueue?.target) : TracingService.layerNoop,
            ),
          );
        }),
      );
  }, [space, chat?.traceQueue?.target]);
};
