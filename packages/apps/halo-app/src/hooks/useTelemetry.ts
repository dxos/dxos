//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

import * as Sentry from '@dxos/sentry';
// import * as Telemetry from '@dxos/telemetry';

import { isInternalUser } from '../util';

// TODO(wittjosiah): Verify if page needs to be reloaded if telemetry is disabled/enabled.
export const useTelemetry = (disabled: boolean) => {
  useEffect(() => {
    if (!disabled && process.env.SENTRY_DSN) {
      console.log({ dsn: process.env.SENTRY_DSN });
      Sentry.init({
        destination: process.env.SENTRY_DSN,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        properties: {
          isInternalUser: isInternalUser()
        }
      });
    }

    // Telemetry.init({
    //   apiKey: process.env.SEGMENT_API_KEY,
    //   batchSize: 20,
    //   enable: Boolean(process.env.SEGMENT_API_KEY) && !disabled
    // });
  }, [disabled]);
};
