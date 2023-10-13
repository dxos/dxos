//
// Copyright 2023 DXOS.org
//

import { type Config } from '@dxos/config';
import * as Sentry from '@dxos/sentry';

export const initSentry = (namespace: string, config: Config) => {
  const release = `${namespace}@${config.get('runtime.app.build.version')}`;
  const environment = config.get('runtime.app.env.DX_ENVIRONMENT');
  const SENTRY_DESTINATION = config.get('runtime.app.env.DX_SENTRY_DESTINATION');
  Sentry.init({
    enable: Boolean(SENTRY_DESTINATION),
    destination: SENTRY_DESTINATION,
    environment,
    release,
  });
};
