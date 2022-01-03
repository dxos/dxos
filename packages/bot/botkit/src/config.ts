//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { Config, defs, mapFromKeyValues } from '@dxos/config';

import defaults from './defaults.json';
import envmap from './env-map.json';

export const BOT_CONFIG_FILENAME = 'bot.yml';

/**
 * Get config from default or specified .yml file.
 */
export const getConfig = () => {
  const config = new Config(
    mapFromKeyValues(envmap, process.env),
    defaults,
  );

  return config;
};
