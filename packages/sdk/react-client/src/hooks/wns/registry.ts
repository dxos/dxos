//
// Copyright 2020 DXOS.org
//

import { useClient } from '../client';

/**
 * Low-level hook returning WNS registry object.
 * See `useRegistryBots` and `useBotFactories` for higher-level hooks.
 */
export const useWNSRegistry = (): any => {
  const { wnsRegistry } = useClient();
  if (!wnsRegistry) {
    console.warn('WNS Registry not configured.');
  }

  return wnsRegistry;
};
