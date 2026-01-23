//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Runtime from 'effect/Runtime';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type Key } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { TracingServiceExt } from '@dxos/functions-runtime';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { useClient } from '@dxos/react-client';

import { type AiChatServices } from '../processor';
import { type Assistant } from '../types';

export type UseChatServicesProps = {
  id?: Key.SpaceId;
  chat?: Assistant.Chat;
};

/**
 * Construct service layer.
 */
// TODO(dmaretskyi): Better return type.
export const useChatServices = ({
  id,
  chat,
}: UseChatServicesProps): (() => Promise<Runtime.Runtime<AiChatServices>>) | undefined => {
  const client = useClient();
  id ??= client.spaces.default.id;

  const runtimeResolver = useCapability(AutomationCapabilities.ComputeRuntime);
  return useMemo(() => {
    const runtime = runtimeResolver.getRuntime(id);
    return () =>
      runtime.runPromise(
        Effect.runtime<AiChatServices>().pipe(
          Effect.provide(
            chat?.traceQueue?.target ? TracingServiceExt.layerQueue(chat.traceQueue?.target) : TracingService.layerNoop,
          ),
        ),
      );
  }, [id, chat?.traceQueue?.target]);
};
