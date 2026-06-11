//
// Copyright 2022 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

import { log } from '@dxos/log';
import { compositeKey } from '@dxos/util';

const OBSERVABILITY_DISABLED_KEY = 'observability-disabled';
const OBSERVABILITY_GROUP_KEY = 'observability-group';
const OTEL_LOG_LEVEL_KEY = 'otel-log-level';

/** No-op in browser contexts. */
export const showObservabilityBanner = () => {
  log.warn('showObservabilityBanner is not supported in browser contexts.');
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const isObservabilityDisabled = async (namespace: string): Promise<boolean> => {
  try {
    return (await localForage.getItem(compositeKey(namespace, OBSERVABILITY_DISABLED_KEY))) === 'true';
  } catch (err) {
    log.catch('Failed to check if observability is disabled, assuming it is', err);
    return true;
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const storeObservabilityDisabled = async (namespace: string, value: boolean) => {
  try {
    await localForage.setItem(compositeKey(namespace, OBSERVABILITY_DISABLED_KEY), String(value));
  } catch (err) {
    log.catch('Failed to store observability disabled', err);
  }
  // Mirror to localStorage so the synchronous opt-out check in the OTEL extension picks it up
  // without waiting for an async IndexedDB read.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${namespace}/${OBSERVABILITY_DISABLED_KEY}`, String(value));
    }
  } catch {
    // localStorage not available (e.g., in workers).
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const getObservabilityGroup = async (namespace: string): Promise<string | undefined> => {
  try {
    return (await localForage.getItem(compositeKey(namespace, OBSERVABILITY_GROUP_KEY))) ?? undefined;
  } catch (err) {
    log.catch('Failed to get observability group', err);
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const storeObservabilityGroup = async (namespace: string, value: string) => {
  try {
    await localForage.setItem(compositeKey(namespace, OBSERVABILITY_GROUP_KEY), value);
  } catch (err) {
    log.catch('Failed to store observability group', err);
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const getOtelLogLevel = async (namespace: string): Promise<string | null> => {
  try {
    return await localForage.getItem<string>(compositeKey(namespace, OTEL_LOG_LEVEL_KEY));
  } catch (err) {
    log.catch('Failed to get OTEL log level', err);
    return null;
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const storeOtelLogLevel = async (namespace: string, value: string | null) => {
  try {
    if (value === null) {
      await localForage.removeItem(compositeKey(namespace, OTEL_LOG_LEVEL_KEY));
    } else {
      await localForage.setItem(compositeKey(namespace, OTEL_LOG_LEVEL_KEY), value);
    }
  } catch (err) {
    log.catch('Failed to store OTEL log level', err);
  }
};
