//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type ServiceType, MockServiceRegistry, type ServiceQuery } from '../types';

export const useServiceRegistry = (query: ServiceQuery): ServiceType[] => {
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
