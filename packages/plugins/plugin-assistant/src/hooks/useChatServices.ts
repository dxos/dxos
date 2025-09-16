//
// Copyright 2025 DXOS.org
//

import { Effect, type Runtime } from 'effect';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { TracingService } from '@dxos/functions';
import { useClient } from '@dxos/react-client';

import { AssistantCapabilities } from '../capabilities';
import { type AiChatServices } from '../processor';
import { type Assistant } from '../types';

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
