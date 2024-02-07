//
// Copyright 2021 DXOS.org
//

/* THIS FILE WILL BE LOADED BY CONTEXT REPLACEMENT PLUGIN IN BROWSER ENVS. */

import localforage from 'localforage';

import { log } from '@dxos/log';

let PERFORMING_CONFIG_SAVE = false;

export const SaveConfig = async () => {
  if (PERFORMING_CONFIG_SAVE) {
    log.warn('Already performing config save');
    return;
  }
  PERFORMING_CONFIG_SAVE = true;

  // NOTE: Load the configuration which is set in `plugin-client` settings
  try {
    const config = await localforage.getItem('dxos.org/settings/config');
    if (config) {
      return config;
    }
  } catch (err) {
    log.warn('Failed to save config', { err });
    return {};
  } finally {
    PERFORMING_CONFIG_SAVE = false;
  }
};
