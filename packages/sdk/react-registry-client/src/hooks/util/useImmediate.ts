//
// Copyright 2020 DXOS.org
//
import { useEffect, useState } from 'react';
import { CID, DomainInfo, IQuery, IRegistryApi, RegistryRecord, Resource } from '@dxos/registry-api';

import { useRegistry } from "..";

/**
 * Returns matching resources.
 */
 export const useImmediate = (query?: IQuery): [unknown, Resource[]] => {
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

  return [error, resources];
};
