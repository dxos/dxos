//
// Copyright 2021 DXOS.org
//

import { DomainInfo } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useQuery } from './useQuery';

interface Result {
  domains: DomainInfo[],
  error?: unknown
}

/**
 * Returns the set of domains.
 */
export const useDomains = (): Result => {
  const registry = useRegistry();
  const data = useQuery(() => registry?.getDomains());

  return {
    domains: data.data,
    error: data.error
  };
};
