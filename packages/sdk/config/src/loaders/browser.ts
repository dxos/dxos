//
// Copyright 2021 DXOS.org
//

/* THIS FILE WILL BE LOADED BY CONTEXT REPLACEMENT PLUGIN IN BROWSER ENVS. */

import localforage from 'localforage';

import { log } from '@dxos/log';

import { parseConfig } from '../config';
import { type ConfigInit } from '../types';

declare const __DXOS_CONFIG__: { publicUrl?: string; dynamic?: boolean };
declare const __CONFIG_ENVS__: ConfigInit | undefined;
declare const __CONFIG_DEFAULTS__: ConfigInit | undefined;
declare const __CONFIG_LOCAL__: ConfigInit | undefined;

const CONFIG_ENDPOINT = '/.well-known/dx/config';
const SETTINGS_KEY = 'org.dxos.settings.config';

export const Profile = (_profile = 'default'): ConfigInit => ({});

export const Local = (): ConfigInit => {
  return typeof __CONFIG_LOCAL__ !== 'undefined' ? __CONFIG_LOCAL__ : {};
};

/**
 * Config served by the host at {@link CONFIG_ENDPOINT}, enabled by `__DXOS_CONFIG__.dynamic`.
 * Yields an empty config when disabled or when the request fails; throws `InvalidConfigError` when
 * the response is served but does not match the schema.
 */
export const Dynamics = async (): Promise<ConfigInit> => {
  const { publicUrl = '', dynamic } = __DXOS_CONFIG__;
  if (!dynamic) {
    log('dynamics disabled');
    return {};
  }

  log('fetching config...', { publicUrl });
  const endpoint = `${publicUrl}${CONFIG_ENDPOINT}`;
  let data: unknown;
  try {
    // `fetch` resolves for 4xx/5xx, whose body would otherwise be read as config.
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    data = await response.json();
  } catch (error) {
    log.warn('Failed to fetch dynamic config.', error);
    return {};
  }

  // Served config is remote input, so it is validated before it reaches `Config`.
  return parseConfig(data, endpoint);
};

export const Envs = (_basePath?: string): ConfigInit => {
  return typeof __CONFIG_ENVS__ !== 'undefined' ? __CONFIG_ENVS__ : {};
};

export const Defaults = (_basePath?: string): ConfigInit => {
  return typeof __CONFIG_DEFAULTS__ !== 'undefined' ? __CONFIG_DEFAULTS__ : {};
};

/**
 * Settings config from browser storage.
 */
export const Storage = async (): Promise<ConfigInit> => {
  try {
    const config = await localforage.getItem<unknown>(SETTINGS_KEY);
    if (config !== null) {
      // Persisted settings outlive the schema that wrote them, so they are validated on read.
      return parseConfig(config, SETTINGS_KEY);
    }
  } catch (err) {
    log.warn('Failed to load config', { err });
  }
  return {};
};

export const Remote = (target: string | undefined, authenticationToken?: string): ConfigInit => {
  if (!target) {
    return {};
  }

  try {
    const url = new URL(target);
    const protocol = url.protocol.slice(0, -1);

    return {
      runtime: {
        client: {
          // TODO(burdon): Remove vault.html.
          remoteSource: url.origin + (protocol.startsWith('http') ? '/vault.html' : ''),
          remoteSourceAuthenticationToken: authenticationToken,
        },
      },
    };
  } catch (err) {
    log.catch(err);
    return {};
  }
};
