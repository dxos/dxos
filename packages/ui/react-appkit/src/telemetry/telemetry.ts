//
// Copyright 2022 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

import type { Client, Config } from '@dxos/client';
import { log } from '@dxos/log';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

export const BASE_TELEMETRY_PROPERTIES: any = {};

if (navigator.storage?.estimate) {
  setInterval(async () => {
    try {
      const storageEstimate = await navigator.storage.estimate();
      BASE_TELEMETRY_PROPERTIES.storageUsage = storageEstimate.usage;
      BASE_TELEMETRY_PROPERTIES.storageQuota = storageEstimate.quota;
    } catch (error) {
      log.warn('Failed to run estimate()', error);
    }
  }, 10e3);
}

// TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
// await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
export const getTelemetryIdentifier = (client: Client) => {
  if (!client?.initialized) {
    return undefined;
  }

  const identity = client.halo.identity.get();
  if (identity) {
    humanize(identity.identityKey);
  }

  return undefined;
};

export const isTelemetryDisabled = async (namespace: string): Promise<boolean> => {
  try {
    return (await localForage.getItem(`${namespace}:telemetry-disabled`)) === 'true';
  } catch (err) {
    log.catch('Failed to check if telemetry disabled, assuming it is', err);
    return true;
  }
};

export const storeTelemetryDisabled = async (namespace: string, value: string) => {
  try {
    await localForage.setItem(`${namespace}:telemetry-disabled`, value);
  } catch (err) {
    log.catch('Failed to store telemetry disabled', err);
  }
};

export const getTelemetryGroup = async (namespace: string): Promise<string | null | undefined> => {
  try {
    return localForage.getItem(`${namespace}:telemetry-group`);
  } catch (err) {
    log.catch('Failed to get telemetry group', err);
  }
};

export type AppTelemetryOptions = {
  namespace: string;
  config: Config;
  sentryOptions?: Sentry.InitOptions;
  telemetryOptions?: Telemetry.InitOptions;
};

// TODO(wittjosiah): Store preference for disabling telemetry.
//   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
//   Needs to be hooked up to settings page for user visibility.
export const initializeAppTelemetry = async ({
  namespace,
  config,
  sentryOptions,
  telemetryOptions
}: AppTelemetryOptions) => {
  try {
    const group = await getTelemetryGroup(namespace);
    const release = `${namespace}@${config.get('runtime.app.build.version')}`;
    const environment = config.get('runtime.app.env.DX_ENVIRONMENT');
    BASE_TELEMETRY_PROPERTIES.group = group;
    BASE_TELEMETRY_PROPERTIES.release = release;
    BASE_TELEMETRY_PROPERTIES.environment = environment;
    const telemetryDisabled = await isTelemetryDisabled(namespace);

    const SENTRY_DESTINATION = config.get('runtime.app.env.DX_SENTRY_DESTINATION');
    Sentry.init({
      enable: Boolean(SENTRY_DESTINATION) && !telemetryDisabled,
      destination: SENTRY_DESTINATION,
      environment,
      release,
      tracing: true,
      replay: true,
      // TODO(wittjosiah): Configure these.
      sampleRate: 1.0,
      replaySampleRate: 0.1,
      replaySampleRateOnError: 1.0,
      ...sentryOptions
    });

    Sentry.configureTracing();

    const TELEMETRY_API_KEY = config.get('runtime.app.env.DX_TELEMETRY_API_KEY');
    Telemetry.init({
      apiKey: TELEMETRY_API_KEY,
      enable: Boolean(TELEMETRY_API_KEY) && !telemetryDisabled,
      ...telemetryOptions
    });

    const ipData = await getIPData(config);
    if (ipData && ipData.city) {
      BASE_TELEMETRY_PROPERTIES.city = ipData.city;
      BASE_TELEMETRY_PROPERTIES.region = ipData.region;
      BASE_TELEMETRY_PROPERTIES.country = ipData.country;
      BASE_TELEMETRY_PROPERTIES.latitude = ipData.latitude;
      BASE_TELEMETRY_PROPERTIES.longitude = ipData.longitude;
    }
  } catch (err) {
    log.error('Failed to initialize app telemetry', err);
  }
};

type IPData = { city: string; region: string; country: string; latitude: number; longitude: number };

const getIPData = async (config: Config): Promise<IPData | void> => {
  const IP_DATA_CACHE_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours
  type CachedIPData = {
    data: IPData;
    timestamp: number;
  };

  // Check cache first.
  const cachedData: null | CachedIPData = await localForage.getItem('dxos:telemetry:ipdata');
  if (cachedData && cachedData.timestamp > Date.now() - IP_DATA_CACHE_TIMEOUT) {
    return cachedData.data;
  }

  // Fetch data if not cached.
  const IPDATA_API_KEY = config.get('runtime.app.env.DX_IPDATA_API_KEY');
  if (IPDATA_API_KEY) {
    return fetch(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        // Cache data.
        localForage
          .setItem('dxos:telemetry:ipdata', {
            data,
            timestamp: Date.now()
          })
          .catch((err) => Sentry.captureException(err));

        return data;
      })
      .catch((err) => Sentry.captureException(err));
  }
};
