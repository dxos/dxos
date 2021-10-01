//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';
import { CID, DomainInfo, IQuery, IRegistryApi, RegistryRecord, Resource } from '@dxos/registry-api';


import { useRegistry } from "..";

interface Result {
  result: RegistryRecord[],
  error?: unknown
} 

/**
 * Returns matching records.
 * @param query
 * @returns [result, error]
 */
 export const useRecords = (query?: IQuery): Result => {
  const registry = useRegistry();
  const [error, setError] = useState<any>(undefined)
  const [records, setRecords] = useState<RegistryRecord[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const resources = await registry?.getRecords(query);
      setRecords(resources ?? []);
    });
  }, [query]);

  return {
    result: records,
    error
  };
};
