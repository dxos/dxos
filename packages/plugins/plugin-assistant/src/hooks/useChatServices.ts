//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Runtime from 'effect/Runtime';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { TracingService } from '@dxos/functions';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { useClient } from '@dxos/react-client';

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
  chat, // TODO(burdon): Pass in queue directly.
}: UseChatServicesProps): (() => Promise<Runtime.Runtime<AiChatServices>>) | undefined => {
  const client = useClient();
  space ??= client.spaces.default;

  const runtimeResolver = useCapability(AutomationCapabilities.ComputeRuntime);
  return useMemo(() => {
    const runtime = runtimeResolver.getRuntime(space.id);
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
