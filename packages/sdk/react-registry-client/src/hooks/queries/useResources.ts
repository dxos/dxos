//
// Copyright 2021 DXOS.org
//

import { Filter, ResourceSet } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  resources: ResourceSet[]
  error?: unknown
}

/**
 * Returns matching resources.
 */
export const useResources = (filter?: Filter): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.listResources(filter), [], [filter]);

  return {
    resources: data.data,
    error: data.error
  };
};
