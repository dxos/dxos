//
// Copyright 2021 DXOS.org
//

import { IQuery, RegistryTypeRecord } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  recordTypes: RegistryTypeRecord[]
  error?: unknown
}

/**
 * Returns matching type records.
 */
export const useRecordTypes = (query?: IQuery): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.getTypeRecords(query), [], [query]);

  return {
    recordTypes: data.data,
    error: data.error
  };
};
