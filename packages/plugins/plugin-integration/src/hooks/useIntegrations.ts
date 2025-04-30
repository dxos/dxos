//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { MockIntegrationRegistry } from '../testing';
import { type IntegrationDefinition, type IntegrationQuery } from '../types';

/**
 * Retrieves matching services from the registry.
 */
export const useIntegrations = (query?: IntegrationQuery): IntegrationDefinition[] => {
  const registry = useMemo(() => new MockIntegrationRegistry(), []);
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const integrations = await registry.queryIntegrations(query);
      setIntegrations(integrations);
    });

    return () => clearTimeout(t);
  }, [query, registry]);

  return integrations;
};
