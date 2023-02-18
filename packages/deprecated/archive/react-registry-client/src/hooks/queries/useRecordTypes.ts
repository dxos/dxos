//
// Copyright 2021 DXOS.org
//

import { Filter, RegistryType } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  recordTypes: RegistryType[];
  error?: unknown;
}

/**
 * Returns matching type records.
 */
export const useRecordTypes = (filter?: Filter): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.listTypeRecords(filter), [], [filter]);

  return {
    recordTypes: data.data,
    error: data.error
  };
};
