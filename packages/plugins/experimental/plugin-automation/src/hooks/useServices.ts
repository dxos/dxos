//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Space } from '@dxos/client/echo';

import { type ServiceType, MockServiceRegistry, type ServiceQuery } from '../types';

/**
 * Retrieves matching services from the registry.
 */
export const useServices = (space: Space, query?: ServiceQuery): ServiceType[] => {
  const registry = useMemo(() => new MockServiceRegistry(), []);
  const [services, setServices] = useState<ServiceType[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const services = await registry.queryServices(query);
      setServices(services);
    });

    return () => clearTimeout(t);
  }, [query, registry]);

  return services;
};
