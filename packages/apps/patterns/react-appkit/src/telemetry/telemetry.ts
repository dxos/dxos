//
// Copyright 2022 DXOS.org
//

import type { Client, Config } from '@dxos/client';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

export const BASE_TELEMETRY_PROPERTIES: any = {};

if (navigator.storage?.estimate) {
  setInterval(async () => {
    const storageEstimate = await navigator.storage.estimate();
    BASE_TELEMETRY_PROPERTIES.storageUsage = storageEstimate.usage;
    BASE_TELEMETRY_PROPERTIES.storageQuota = storageEstimate.quota;
  }, 10e3);
}

// TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
// await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
export const getTelemetryIdentifier = (client: Client) => {
  const profile = client.halo.profile;
  if (profile) {
    humanize(profile.identityKey);
  }

  return undefined;
};

export const isTelemetryDisabled = (namespace: string) =>
  localStorage.getItem(`${namespace}:telemetry-disabled`) === 'true';

// TODO(wittjosiah): Store preference for disabling telemetry.
//   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
//   Needs to be hooked up to settings page for user visibility.
export const initializeAppTelemetry = async (namespace: string, config: Config) => {
  const group = localStorage.getItem(`${namespace}:telemetry-group`);
  const release = `${namespace}@${config.get('runtime.app.build.version')}`;
  const environment = config.get('runtime.app.env.DX_ENVIRONMENT');
  BASE_TELEMETRY_PROPERTIES.group = group;
  BASE_TELEMETRY_PROPERTIES.release = release;
  BASE_TELEMETRY_PROPERTIES.environment = environment;
  const telemetryDisabled = isTelemetryDisabled(namespace);

  const SENTRY_DESTINATION = config.get('runtime.app.env.DX_SENTRY_DESTINATION');
  Sentry.init({
    enable: Boolean(SENTRY_DESTINATION) && !telemetryDisabled,
    destination: SENTRY_DESTINATION,
    environment,
    release,
    // TODO(wittjosiah): Configure this.
    sampleRate: 1.0
  });

  const TELEMETRY_API_KEY = config.get('runtime.app.env.DX_TELEMETRY_API_KEY');
  Telemetry.init({
    apiKey: TELEMETRY_API_KEY,
    enable: Boolean(TELEMETRY_API_KEY) && !telemetryDisabled
  });

  const IPDATA_API_KEY = config.get('runtime.app.env.DX_IPDATA_API_KEY');
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
      .catch((err) => Sentry.captureException(err));
  }
};
