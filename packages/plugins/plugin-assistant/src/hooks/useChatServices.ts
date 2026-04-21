//
// Copyright 2025 DXOS.org
//

import { useCapability } from '@dxos/app-framework/ui';
import { Capabilities } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { type Key } from '@dxos/echo';
import { useClient } from '@dxos/react-client';

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
  id ??= getPersonalSpace(client)?.id;

  const runtime = useCapability(Capabilities.ProcessManagerRuntime);
  return id ? runtime : undefined;
};
