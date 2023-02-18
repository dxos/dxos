//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import * as Telemetry from '@dxos/telemetry';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier, setupTelemetryListeners } from '../telemetry';

export type UseTelemetryOptions = {
  namespace: string;
  router?: boolean;
};

/**
 * Hooks up navigation and click events to telemetry.
 *
 * Must be called inside a react router context.
 */
export const useTelemetry = ({ namespace, router = true }: UseTelemetryOptions) => {
  const location = router ? useLocation() : null;
  const client = useClient();

  useEffect(() => {
    Telemetry.event({
      identityId: getTelemetryIdentifier(client),
      name: `${namespace}.page.load`,
      properties: {
        ...BASE_TELEMETRY_PROPERTIES,
        href: window.location.href,
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart
      }
    });

    return setupTelemetryListeners(namespace, client);
  }, []);

  useEffect(() => {
    Telemetry.page({
      identityId: getTelemetryIdentifier(client),
      properties: BASE_TELEMETRY_PROPERTIES
    });
  }, [location]);
};
