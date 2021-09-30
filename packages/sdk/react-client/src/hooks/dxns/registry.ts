//
// Copyright 2020 DXOS.org
//

import { useClient } from '../client';

/**
 * Low-level hook returning WNS registry object.
 * See `useRegistryBots` and `useBotFactories` for higher-level hooks.
 */
export const useRegistry = () => {
  const { registry } = useClient();
  if (!registry) {
    console.warn('DXNS Registry not configured.');
  }

  return registry;
};
