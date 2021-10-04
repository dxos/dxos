//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { IQuery, RegistryRecord } from '@dxos/registry-client';

import { useRegistry } from '..';

interface Result {
  records: RegistryRecord[],
  error?: unknown
}

/**
 * Returns matching records.
 */
export const useRecords = (query?: IQuery): Result => {
  const registry = useRegistry();
  const [error, setError] = useState<any>(undefined);
  const [records, setRecords] = useState<RegistryRecord[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      try {
        const resources = await registry?.getRecords(query);
        setRecords(resources ?? []);
      } catch (e: unknown) {
        setError(e);
      }
    });
  }, [query]);

  return {
    records,
    error
  };
};
