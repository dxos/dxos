//
// Copyright 2020 DXOS.org
//

import { useClient } from './useClient';

/**
 * Hook returning config object used to initialize the DXOS client instance.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useConfig = () => {
  const client = useClient();
  return client.config;
};
