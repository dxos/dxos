//
// Copyright 2021 DXOS.org
//

import { Query, RegistryType } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  recordTypes: RegistryType[]
  error?: unknown
}

/**
 * Returns matching type records.
 */
export const useRecordTypes = (query?: Query): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.getTypeRecords(query), [], [query]);

  return {
    recordTypes: data.data,
    error: data.error
  };
};
