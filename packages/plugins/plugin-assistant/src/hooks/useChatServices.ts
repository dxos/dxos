//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Runtime from 'effect/Runtime';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Key } from '@dxos/echo';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { useClient } from '@dxos/react-client';

import { type AiChatServices } from '../processor';

export type UseChatServicesProps = {
  id?: Key.SpaceId;
};

/**
 * Construct service layer.
 * TracingService is provided by the compute-runtime and traces to space.properties.invocationTraceQueue.
 */
export const useChatServices = ({
  id,
}: UseChatServicesProps): (() => Promise<Runtime.Runtime<AiChatServices>>) | undefined => {
  const client = useClient();
  id ??= client.spaces.default.id;

  const runtimeResolver = useCapability(AutomationCapabilities.ComputeRuntime);
  return useMemo(() => {
    const runtime = runtimeResolver.getRuntime(id);
    return () => runtime.runPromise(Effect.runtime<AiChatServices>());
  }, [id]);
};
