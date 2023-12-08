//
// Copyright 2022 DXOS.org
//

/*
 * try and reflect changes in react-appkit, minus the activation of metrics?
 */

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

// import { type Platform } from '@dxos/client-services';
import { log } from '@dxos/log';
import { Observability } from '@dxos/observability';
import type { Client, Config } from '@dxos/react-client';
// import { type InitOptions as TelemetryInitOptions } from '@dxos/telemetry';
import { humanize } from '@dxos/util';

export const BASE_TELEMETRY_PROPERTIES: any = {};
// item name is 'telemetry' for backwards compatibility
export const OBSERVABILITY_DISABLED_KEY = 'telemetry-disabled';
export const OBSERVABILITY_GROUP_KEY = 'telemetry-group';

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

export const isObservabilityDisabled = async (namespace: string): Promise<boolean> => {
  try {
    return (await localForage.getItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`)) === 'true';
  } catch (err) {
    log.catch('Failed to check if observability is disabled, assuming it is', err);
    return true;
  }
};

export const storeObservabilityDisabled = async (namespace: string, value: string) => {
  try {
    await localForage.setItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`, value);
  } catch (err) {
    log.catch('Failed to store observability disabled', err);
  }
};

export const getObservabilityGroup = async (namespace: string): Promise<string | null | undefined> => {
  try {
    return localForage.getItem(`${namespace}:${OBSERVABILITY_GROUP_KEY}`);
  } catch (err) {
    log.catch('Failed to get observability group', err);
  }
};

export type AppObservabilityOptions = {
  namespace: string;
  config: Config;
  tracingEnable?: boolean;
  replayEnable?: boolean;
  // enable Segment Telemetry
  telemetryEnable?: boolean;
  // TODO(nf): options for providers?
};

type IPData = { city: string; region: string; country: string; latitude: number; longitude: number };

// TODO(wittjosiah): Store preference for disabling telemetry.
//   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
//   Needs to be hooked up to settings page for user visibility.
export const initializeAppObservability = async (
  { namespace, config, tracingEnable = true, replayEnable = true, telemetryEnable = true }: AppObservabilityOptions,
  client?: Client,
): Promise<Observability> => {
  log.info('initializeAppObservability', { config });

  /*
    const platform = (await client.services.services.SystemService?.getPlatform()) as Platform;
    if (!platform) {
      log.error('failed to get platform, could not initialize observability');
      return undefined;
    }
    */
  // const Telemetry = await import('@dxos/telemetry');
  // const Sentry = await import('@dxos/sentry');

  const group = (await getObservabilityGroup(namespace)) ?? undefined;
  const release = `${namespace}@${config.get('runtime.app.build.version')}`;
  const environment = config.get('runtime.app.env.DX_ENVIRONMENT');
  BASE_TELEMETRY_PROPERTIES.group = group;
  BASE_TELEMETRY_PROPERTIES.release = release;
  BASE_TELEMETRY_PROPERTIES.environment = environment;
  const observabilityDisabled = await isObservabilityDisabled(namespace);

  // TODO(nf): configure mode
  const observability = new Observability({ namespace, group, mode: 'full', config });

  // global kill switch
  if (observabilityDisabled) {
    observability.disable();
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

    // TODO(nf): plugin state?

    // TODO(nf): should provide capability to init Sentry earlier in booting process to capture errors during initialization.

    observability.initSentry({
      environment,
      release,
      tracing: tracingEnable,
      replay: replayEnable,
      // TODO(wittjosiah): Configure these.
      sampleRate: 1.0,
      replaySampleRate: 0.1,
      replaySampleRateOnError: 1.0,
    });

    if (telemetryEnable) {
      observability.initTelemetry();
    }

    const ipData = await getIPData(config);
    if (ipData && ipData.city) {
      BASE_TELEMETRY_PROPERTIES.city = ipData.city;
      BASE_TELEMETRY_PROPERTIES.region = ipData.region;
      BASE_TELEMETRY_PROPERTIES.country = ipData.country;
      BASE_TELEMETRY_PROPERTIES.latitude = ipData.latitude;
      BASE_TELEMETRY_PROPERTIES.longitude = ipData.longitude;
    }

    // Start client observability (i.e. not running as shared worker)
    // TODO(nf): how to prevent multiple instances for single shared worker?
    if (client) {
      observability.initMetrics();
      await observability.setIdentityTags(client);
      await observability.setDeviceTags(client);
      await observability.startNetworkMetrics(client);
      await observability.startSpacesMetrics(client);
      await observability.startRuntimeMetrics(client);
    }
  } catch (err: any) {
    log.error('Failed to initialize app observability', err);
  }
  return observability;
};
