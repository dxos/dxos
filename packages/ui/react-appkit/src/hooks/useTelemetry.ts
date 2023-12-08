//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { type Observability } from '@dxos/observability';
import { useClient } from '@dxos/react-client';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier, setupTelemetryListeners } from '../observability';

export type UseTelemetryOptions = {
  namespace: string;
  observability: Observability;
  router?: boolean;
};

/**
 * Hooks up navigation and click events to telemetry.
 *
 * Must be called inside a react router context.
 */
export const useTelemetry = ({ namespace, observability, router = true }: UseTelemetryOptions) => {
  const location = router ? useLocation() : null;
  const client = useClient();

  useEffect(() => {
    observability.telemetryEvent({
      identityId: getTelemetryIdentifier(client),
      name: `${namespace}.page.load`,
      properties: {
        ...BASE_TELEMETRY_PROPERTIES,
        href: window.location.href,
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
      },
    });

    return setupTelemetryListeners(namespace, client, observability);
  }, []);

  useEffect(() => {
    observability.telemetryPage({
      identityId: getTelemetryIdentifier(client),
      properties: BASE_TELEMETRY_PROPERTIES,
    });
  }, [location]);
};
