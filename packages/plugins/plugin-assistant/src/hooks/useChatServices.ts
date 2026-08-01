//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useActivationSignal, useCapability } from '@dxos/app-framework/ui';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Key } from '@dxos/echo';
import { useClient } from '@dxos/react-client';

import { AssistantEvents } from '#types';

export type UseChatServicesProps = {
  id?: Key.SpaceId;
};

/**
 * Resolves the shared {@link Capabilities.ProcessManagerRuntime} for the given space.
 *
 * The runtime itself is space-agnostic; the returned value can be used to run
 * effects that pipe through {@link ServiceResolver.provide} (or the
 * `useSpaceCallback`/`useSpaceService` hooks) with the resolved {@link Key.SpaceId}.
 */
export const useChatServices = ({ id }: UseChatServicesProps) => {
  const client = useClient();
  id ??= AppSpace.getPersonalSpace(client)?.id;

  // Every chat entry point resolves its services here, so this is the assistant-in-use demand
  // signal: start-gated assistant modules (skills included) load now and register via the
  // reactive RegistrySync.
  useActivationSignal(AssistantEvents.Start);
  const runtime = useCapability(Capabilities.ProcessManagerRuntime);
  return id ? runtime : undefined;
};
