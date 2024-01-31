//
// Copyright 2022 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

// import { type Platform } from '@dxos/client-services';
import type { Client, Config } from '@dxos/client';
import { log } from '@dxos/log';
// import { type InitOptions as TelemetryInitOptions } from '@dxos/telemetry';

import type { Mode, Observability } from '../observability';

export const BASE_TELEMETRY_PROPERTIES: any = {};
// item name is 'telemetry' for backwards compatibility
export const OBSERVABILITY_DISABLED_KEY = 'telemetry-disabled';
export const OBSERVABILITY_GROUP_KEY = 'telemetry-group';

if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
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

// TODO(wittjosiah): Improve privacy of telemetry identifiers.
//  - Identifier should be generated client-side with no attachment to identity.
//  - Identifier can then be reset by user.
//  - Identifier can be synced via HALO to allow for correlation of events bewteen devices.
//  - Identifier should also be stored outside of HALO such that it is available immediately on startup.
export const getTelemetryIdentifier = (client: Client) => {
  if (!client?.initialized) {
    return undefined;
  }

  const identity = client.halo.identity.get();
  if (identity) {
    return identity.identityKey.truncate();
  }

  return undefined;
};

export const isObservabilityDisabled = async (namespace: string): Promise<boolean> => {
  try {
    return (await localForage.getItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`)) === 'true';
  } catch (err) {
    log.catch('Failed to check if observability is disabled, assuming it is', err);
    return true;
  }
};

export const storeObservabilityDisabled = async (namespace: string, value: boolean) => {
  try {
    await localForage.setItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`, String(value));
  } catch (err) {
    log.catch('Failed to store observability disabled', err);
  }
};

export const getObservabilityGroup = async (namespace: string): Promise<string | undefined> => {
  try {
    return (await localForage.getItem(`${namespace}:${OBSERVABILITY_GROUP_KEY}`)) ?? undefined;
  } catch (err) {
    log.catch('Failed to get observability group', err);
  }
};

export const storeObservabilityGroup = async (namespace: string, value: string) => {
  try {
    await localForage.setItem(`${namespace}:${OBSERVABILITY_GROUP_KEY}`, value);
  } catch (err) {
    log.catch('Failed to store observability group', err);
  }
};

export type AppObservabilityOptions = {
  namespace: string;
  config: Config;
  mode?: Mode;
  tracingEnable?: boolean;
  replayEnable?: boolean;
  // TODO(nf): options for providers?
};

type IPData = { city: string; region: string; country: string; latitude: number; longitude: number };

// TODO(wittjosiah): Store preference for disabling telemetry.
//   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
//   Needs to be hooked up to settings page for user visibility.
export const initializeAppObservability = async ({
  namespace,
  config,
  mode = 'basic',
  tracingEnable = true,
  replayEnable = true,
}: AppObservabilityOptions): Promise<Observability> => {
  log('initializeAppObservability', { config });

  /*
    const platform = (await client.services.services.SystemService?.getPlatform()) as Platform;
    if (!platform) {
      log.error('failed to get platform, could not initialize observability');
      return undefined;
    }
    */

  const group = (await getObservabilityGroup(namespace)) ?? undefined;
  const release = `${namespace}@${config.get('runtime.app.build.version')}`;
  const environment = config.get('runtime.app.env.DX_ENVIRONMENT');
  BASE_TELEMETRY_PROPERTIES.group = group;
  BASE_TELEMETRY_PROPERTIES.release = release;
  BASE_TELEMETRY_PROPERTIES.environment = environment;
  const observabilityDisabled = await isObservabilityDisabled(namespace);

  const { Observability } = await import('../observability');

  // TODO(nf): configure mode
  const observability = new Observability({
    namespace,
    group,
    mode,
    config,
    errorLog: {
      sentryInitOptions: {
        environment,
        release,
        tracing: tracingEnable,
        replay: replayEnable,
        // TODO(wittjosiah): Configure these.
        sampleRate: 1.0,
        replaySampleRate: 0.1,
        replaySampleRateOnError: 1.0,
      },
    },
  });

  // global kill switch
  if (observabilityDisabled) {
    observability.setMode('disabled');
    log.info('observability disabled');
    return observability;
  }

  try {
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

      // TODO(nf): move into observability
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
                timestamp: Date.now(),
              })
              .catch((err) => observability.captureException(err));

            return data;
          })
          .catch((err) => observability.captureException(err));
      }
    };

    const ipData = await getIPData(config);
    if (ipData && ipData.city) {
      BASE_TELEMETRY_PROPERTIES.city = ipData.city;
      BASE_TELEMETRY_PROPERTIES.region = ipData.region;
      BASE_TELEMETRY_PROPERTIES.country = ipData.country;
      BASE_TELEMETRY_PROPERTIES.latitude = ipData.latitude;
      BASE_TELEMETRY_PROPERTIES.longitude = ipData.longitude;
    }

    // TODO(nf): plugin state?

    // TODO(nf): should provide capability to init Sentry earlier in booting process to capture errors during initialization.

    observability.initialize();
  } catch (err: any) {
    log.error('Failed to initialize app observability', err);
  }

  return observability;
};
