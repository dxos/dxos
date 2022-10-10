//
// Copyright 2021 DXOS.org
//

import { Authority } from '@dxos/registry-client';

import { useRegistry } from '../registry/index.js';
import { useAsync } from './useAsync.js';

interface Result {
  authorities: Authority[]
  error?: unknown
}

/**
 * Returns the set of authorities.
 */
export const useAuthorities = (): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.listAuthorities(), []);

  return {
    authorities: data.data,
    error: data.error
  };
};
