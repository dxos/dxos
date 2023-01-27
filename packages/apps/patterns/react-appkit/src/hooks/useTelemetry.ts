//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import * as Sentry from '@dxos/sentry';
import { captureException } from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { BASE_TELEMETRY_PROPERTIES, DX_TELEMETRY, getTelemetryIdentifier, setupTelemetryListeners } from '../telemetry';

export type UseTelemetryOptions = {
  namespace: string;
  router?: boolean;
};

export const useTelemetry = ({ namespace, router = true }: UseTelemetryOptions) => {
  const location = router ? useLocation() : null;
  const client = useClient();
  const telemetryDisabled = useMemo(() => DX_TELEMETRY === 'true', []);

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
  //   Needs to be hooked up to settings page for user visibility.

  useEffect(() => {
    setTimeout(async () => {
      const release = `${namespace}@${client.config.get('runtime.app.build.version')}`;
      const environment = client.config.get('runtime.app.env.DX_ENVIRONMENT');
      BASE_TELEMETRY_PROPERTIES.release = release;
      BASE_TELEMETRY_PROPERTIES.environment = environment;

      const SENTRY_DESTINATION = client.config.get('runtime.app.env.DX_SENTRY_DESTINATION');
      if (SENTRY_DESTINATION && !telemetryDisabled) {
        Sentry.init({
          destination: SENTRY_DESTINATION,
          environment,
          release,
          // TODO(wittjosiah): Configure this.
          sampleRate: 1.0
        });
      }

      const TELEMETRY_API_KEY = client.config.get('runtime.app.env.DX_TELEMETRY_API_KEY');
      Telemetry.init({
        apiKey: TELEMETRY_API_KEY,
        enable: Boolean(TELEMETRY_API_KEY) && !telemetryDisabled
      });

      const IPDATA_API_KEY = client.config.get('runtime.app.env.DX_IPDATA_API_KEY');
      if (IPDATA_API_KEY) {
        await fetch(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`)
          .then((res) => res.json())
          .then((data) => {
            BASE_TELEMETRY_PROPERTIES.city = data.city;
            BASE_TELEMETRY_PROPERTIES.region = data.region;
            BASE_TELEMETRY_PROPERTIES.country = data.country;
            BASE_TELEMETRY_PROPERTIES.latitude = data.latitude;
            BASE_TELEMETRY_PROPERTIES.longitude = data.longitude;
          })
          .catch((err) => captureException(err));
      }

      Telemetry.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.page.load`,
        properties: {
          ...BASE_TELEMETRY_PROPERTIES,
          href: window.location.href,
          loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart
        }
      });
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
