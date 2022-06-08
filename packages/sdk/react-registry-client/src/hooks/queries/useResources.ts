//
// Copyright 2021 DXOS.org
//

import { Query, Resource } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  resources: Resource[],
  error?: unknown
}

/**
 * Returns matching resources.
 */
export const useResources = (query?: Query): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.getResources(query), [], [query]);

  return {
    resources: data.data,
    error: data.error
  };
};
