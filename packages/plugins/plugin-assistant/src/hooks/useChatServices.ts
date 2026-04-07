//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Key } from '@dxos/echo';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { useClient } from '@dxos/react-client';

export type UseChatServicesProps = {
  id?: Key.SpaceId;
};

/**
 * Resolves the compute runtime for a space.
 */
export const useChatServices = ({ id }: UseChatServicesProps) => {
  const client = useClient();
  id ??= getPersonalSpace(client)?.id;

  const runtimeResolver = useCapability(AutomationCapabilities.ComputeRuntime);
  return useMemo(() => (!id ? undefined : runtimeResolver.getRuntime(id)), [id]);
};
