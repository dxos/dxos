//
// Copyright 2022 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

import { log } from '@dxos/log';

const OBSERVABILITY_DISABLED_KEY = 'observability-disabled';
const OBSERVABILITY_GROUP_KEY = 'observability-group';

export const showObservabilityBanner = () => {
  throw new Error('Not implemented');
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const isObservabilityDisabled = async (namespace: string): Promise<boolean> => {
  try {
    return (await localForage.getItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`)) === 'true';
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
    await localForage.setItem(`${namespace}:${OBSERVABILITY_DISABLED_KEY}`, String(value));
  } catch (err) {
    log.catch('Failed to store observability disabled', err);
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const getObservabilityGroup = async (namespace: string): Promise<string | undefined> => {
  try {
    return (await localForage.getItem(`${namespace}:${OBSERVABILITY_GROUP_KEY}`)) ?? undefined;
  } catch (err) {
    log.catch('Failed to get observability group', err);
  }
};

/**
 * @param namespace - localForage key prefix used to scope the observability state in browser storage.
 */
export const storeObservabilityGroup = async (namespace: string, value: string) => {
  try {
    await localForage.setItem(`${namespace}:${OBSERVABILITY_GROUP_KEY}`, value);
  } catch (err) {
    log.catch('Failed to store observability group', err);
  }
};
