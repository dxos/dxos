//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

// TODO(wittjosiah): Verify if page needs to be reloaded if telemetry is disabled/enabled.
export const useTelemetry = (disabled: boolean) => {
  useEffect(() => {
    if (!disabled && process.env.SENTRY_DESTINATION) {
      // TODO(wittjosiah): Use Sentry error boundary.
      Sentry.init({
        machineId: 'default',
        destination: process.env.SENTRY_DESTINATION,
        environment: process.env.DX_ENVIRONMENT,
        release: process.env.DX_RELEASE,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        properties: {
          isInternalUser: isInternalUser()
        }
      });
    }

    Telemetry.init({
      apiKey: process.env.TELEMETRY_KEY,
      batchSize: 20,
      enable: Boolean(process.env.TELEMETRY_KEY) && !disabled
    });
  }, [disabled]);
};

export const isInternalUser = () => {
  return Boolean(localStorage.get('isInternalUser'));
};
