//
// Copyright 2021 DXOS.org
//

import { Query, RegistryRecord } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  records: RegistryRecord[],
  error?: unknown
}

/**
 * Returns matching records.
 */
export const useRecords = (query?: Query): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.listRecords(query), [], [query]);

  return {
    records: data.data,
    error: data.error
  };
};
