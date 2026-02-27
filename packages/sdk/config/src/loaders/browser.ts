//
// Copyright 2021 DXOS.org
//

/* THIS FILE WILL BE LOADED BY CONTEXT REPLACEMENT PLUGIN IN BROWSER ENVS. */

import localforage from 'localforage';

import { log } from '@dxos/log';
import { create } from '@dxos/protocols/buf';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';

declare const __DXOS_CONFIG__: { publicUrl?: string; dynamic?: boolean };
declare const __CONFIG_ENVS__: Partial<ConfigProto> | undefined;
declare const __CONFIG_DEFAULTS__: Partial<ConfigProto> | undefined;
declare const __CONFIG_LOCAL__: Partial<ConfigProto> | undefined;

const CONFIG_ENDPOINT = '/.well-known/dx/config';

export const Profile = (_profile = 'default'): Partial<ConfigProto> => ({});

export const Local = (): Partial<ConfigProto> => {
  return typeof __CONFIG_LOCAL__ !== 'undefined' ? __CONFIG_LOCAL__ : {};
};

export const Dynamics = async (): Promise<Partial<ConfigProto>> => {
  const { publicUrl = '', dynamic } = __DXOS_CONFIG__;
  if (!dynamic) {
    log('dynamics disabled');
    return {};
  }

  log('fetching config...', { publicUrl });
  return await fetch(`${publicUrl}${CONFIG_ENDPOINT}`)
    .then((res) => res.json())
    .catch((error) => {
      log.warn('Failed to fetch dynamic config.', error);
      return {};
    });
};

export const Envs = (_basePath?: string): Partial<ConfigProto> => {
  return typeof __CONFIG_ENVS__ !== 'undefined' ? __CONFIG_ENVS__ : {};
};

export const Defaults = (_basePath?: string): Partial<ConfigProto> => {
  return typeof __CONFIG_DEFAULTS__ !== 'undefined' ? __CONFIG_DEFAULTS__ : {};
};

/**
 * Settings config from browser storage.
 */
export const Storage = async (): Promise<Partial<ConfigProto>> => {
  try {
    const config = await localforage.getItem<Partial<ConfigProto>>('dxos.org/settings/config');
    if (config) {
      return config;
    }
  } catch (err) {
    log.warn('Failed to load config', { err });
  }
  return {};
};

export const Remote = (target: string | undefined, authenticationToken?: string): Partial<ConfigProto> => {
  if (!target) {
    return {};
  }

  try {
    const url = new URL(target);
    const protocol = url.protocol.slice(0, -1);

    return create(ConfigSchema, {
      runtime: {
        client: {
          // TODO(burdon): Remove vault.html.
          remoteSource: url.origin + (protocol.startsWith('http') ? '/vault.html' : ''),
          remoteSourceAuthenticationToken: authenticationToken,
        },
      },
    });
  } catch (err) {
    log.catch(err);
    return {};
  }
};
