//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient, useIdentity } from '@dxos/react-client';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

import { DX_ENVIRONMENT, DX_RELEASE, BASE_PROPERTIES } from './base-properties';
import { setupWindowListeners } from './listeners';

const SENTRY_DESTINATION = process.env.SENTRY_DESTINATION;
const TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY;

export const useTelemetry = () => {
  const location = useLocation();

  // TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
  // await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
  const client = useClient();
  const identity = useIdentity();
  const identityId = useMemo(() => identity && humanize(identity.identityKey), [identity]);

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

    Telemetry.event({
      identityId,
      name: 'halo-app.page.load',
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
      identityId,
      properties: BASE_PROPERTIES
    });
  }, [location]);
};
