//
// Copyright 2020 DXOS.org
//

import { useClient } from '../client';

/**
 * Low-level hook returning DXNS registry object.
 * See `useRegistryBots` and `useBotFactories` for higher-level hooks.
 * @returns DXNS registry
 */
export const useRegistry = () => {
  const { registry } = useClient();
  if (!registry) {
    console.warn('Registry not configured.');
  }

  return registry;
};
