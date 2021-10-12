//
// Copyright 2021 DXOS.org
//

import { Domain } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  domains: Domain[],
  error?: unknown
}

/**
 * Returns the set of domains.
 */
export const useDomains = (): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.getDomains(), []);

  return {
    domains: data.data,
    error: data.error
  };
};
