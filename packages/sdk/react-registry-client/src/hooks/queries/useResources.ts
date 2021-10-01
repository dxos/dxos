//
// Copyright 2020 DXOS.org
//
import { useEffect, useState } from 'react';
import { CID, DomainInfo, IQuery, IRegistryApi, RegistryRecord, Resource } from '@dxos/registry-api';

import { useRegistry } from "..";

interface Result {
  resources: Resource[],
  error?: unknown
} 

/**
 * Returns matching resources.
 */
 export const useResources = (query?: IQuery): Result => {
  const registry = useRegistry();
  const [error, setError] = useState<any>(undefined)
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      try {
        const resources = await registry?.getResources(query);
        setResources(resources ?? []);
      } catch(e: unknown) {
        setError(e);
      }
    });
  }, [query]);

  return {
    resources,
    error
  };
};
