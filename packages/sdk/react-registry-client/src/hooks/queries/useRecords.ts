//
// Copyright 2021 DXOS.org
//

import { IQuery, RegistryRecord } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

interface Result {
  records: RegistryRecord[],
  error?: unknown
}

/**
 * Returns matching records.
 */
export const useRecords = (query?: IQuery): Result => {
  const registry = useRegistry();
  const data = useAsync(() => registry?.getRecords(query), [], [query]);

  return {
    records: data.data,
    error: data.error
  };
};
