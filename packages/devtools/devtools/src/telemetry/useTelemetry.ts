//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { DX_ENVIRONMENT, DX_RELEASE, BASE_PROPERTIES, getIdentifier, DX_TELEMETRY } from './base-properties';
import { setupWindowListeners } from './listeners';

const SENTRY_DESTINATION = process.env.SENTRY_DESTINATION;
const TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY;

export const useTelemetry = () => {
  const client = useClient();
  const telemetryDisabled = useMemo(() => DX_TELEMETRY === 'true', []);

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in devtools preference.
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
      identityId: getIdentifier(client),
      name: 'devtools-app.page.load',
      properties: {
        ...BASE_PROPERTIES,
        href: window.location.href,
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart
      }
    });

    return setupWindowListeners(client);
  }, []);

  useAsyncEffect(async () => {
    Telemetry.page({
      identityId: getIdentifier(client),
      properties: BASE_PROPERTIES
    });
  }, []);
};
