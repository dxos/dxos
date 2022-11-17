//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import {
  BASE_TELEMETRY_PROPERTIES,
  DX_ENVIRONMENT,
  DX_RELEASE,
  DX_TELEMETRY,
  getTelemetryIdentifier,
  setupTelemetryListeners
} from '../telemetry';

const SENTRY_DESTINATION = process.env.SENTRY_DESTINATION;
const TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY;

export type UseTelemetryOptions = {
  namespace: string;
};

export const useTelemetry = ({ namespace }: UseTelemetryOptions) => {
  const location = useLocation();
  const client = useClient();
  const telemetryDisabled = useMemo(() => DX_TELEMETRY === 'true', []);

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
  //   Needs to be hooked up to settings page for user visibility.

  useEffect(() => {
    if (SENTRY_DESTINATION && !telemetryDisabled) {
      Sentry.init({
        destination: SENTRY_DESTINATION,
        environment: DX_ENVIRONMENT,
        release: DX_RELEASE,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0
      });
    }

    Telemetry.init({
      apiKey: TELEMETRY_API_KEY,
      enable: Boolean(TELEMETRY_API_KEY) && !telemetryDisabled
    });

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

  useAsyncEffect(async () => {
    Telemetry.page({
      identityId: getTelemetryIdentifier(client),
      properties: BASE_TELEMETRY_PROPERTIES
    });
  }, [location]);
};
