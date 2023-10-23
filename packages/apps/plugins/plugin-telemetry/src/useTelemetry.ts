//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

import { parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier, setupTelemetryListeners, withTelemetry } from './telemetry';

export type UseTelemetryOptions = {
  namespace: string;
};

/**
 * Hooks up navigation and click events to telemetry.
 */
export const useTelemetry = ({ namespace }: UseTelemetryOptions) => {
  const splitViewPlugin = useResolvePlugin(parseLayoutPlugin);
  const client = useClient();

  useEffect(() => {
    void withTelemetry((Telemetry) => {
      Telemetry.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.page.load`,
        properties: {
          ...BASE_TELEMETRY_PROPERTIES,
          href: window.location.href,
          loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
        },
      });
    });

    return setupTelemetryListeners(namespace, client);
  }, []);

  useEffect(() => {
    void withTelemetry((Telemetry) => {
      Telemetry.page({
        identityId: getTelemetryIdentifier(client),
        properties: BASE_TELEMETRY_PROPERTIES,
      });
    });
  }, [splitViewPlugin?.provides.layout.active]);
};
