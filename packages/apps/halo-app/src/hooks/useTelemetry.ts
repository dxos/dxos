//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAsyncEffect } from '@dxos/react-async';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT;
const DX_RELEASE = process.env.DX_RELEASE;
const SENTRY_DESTINATION = process.env.SENTRY_DESTINATION;
const TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY;

export const useTelemetry = () => {
  // const client = useClient();
  const location = useLocation();

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
  //   Needs to be hooked up to settings page for user visibility.

  useEffect(() => {
    if (SENTRY_DESTINATION) {
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
      enable: Boolean(TELEMETRY_API_KEY)
    });
  }, []);

  useAsyncEffect(async () => {
    // TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
    // await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
    const identityId = undefined;
    Telemetry.page({
      identityId,
      properties: {
        environment: DX_ENVIRONMENT,
        release: DX_RELEASE
      }
    });
  }, [location]);
};
