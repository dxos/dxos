//
// Copyright 2021 DXOS.org
//

import { Filter, RegistryRecord } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  records: RegistryRecord[];
  error?: unknown;
}

/**
 * Returns matching records.
 */
export const useRecords = (filter?: Filter): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.listRecords(filter), [], [filter]);

  return {
    records: data.data,
    error: data.error
  };
};
