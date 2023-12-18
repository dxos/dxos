//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

import { parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { type Observability } from '@dxos/observability';
import { useClient } from '@dxos/react-client';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier, setupTelemetryListeners } from './observability';

export type UseTelemetryOptions = {
  namespace: string;
  observability?: Observability;
};

/**
 * Hooks up navigation and click events to telemetry.
 */
export const useTelemetry = ({ namespace, observability }: UseTelemetryOptions) => {
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const client = useClient();

  if (!observability) {
    return;
  }
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
  }, [layoutPlugin?.provides.layout.active]);
};
