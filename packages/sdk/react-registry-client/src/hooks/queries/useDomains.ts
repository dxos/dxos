//
// Copyright 2020 DXOS.org
//
import { useEffect, useState } from 'react';
import { CID, DomainInfo, IQuery, IRegistryApi, RegistryRecord, Resource } from '@dxos/registry-client';

import { useRegistry } from "..";

interface Result {
  domains: DomainInfo[],
  error?: unknown
} 

/**
 * Returns the set of domains.
 */
 export const useDomains = (): Result => {
  const registry = useRegistry();
  const [error, setError] = useState<any>(undefined)
  const [domains, setDomains] = useState<DomainInfo[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      try {
        const domains = await registry?.getDomains();
        setDomains(domains ?? []);
      } catch (e: unknown) {
        setError(e);
      }
    });
  }, []);

  return {
    domains,
    error
  };
};
