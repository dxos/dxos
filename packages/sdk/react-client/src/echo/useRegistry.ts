//
// Copyright 2026 DXOS.org
//

import { type Registry } from '@dxos/echo';

import { useClient } from '../client';

/**
 * Returns the hypergraph registry attached to the current client.
 */
export const useRegistry = (): Registry.Registry => {
  const client = useClient();
  return client.graph.registry;
};
