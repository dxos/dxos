//
// Copyright 2020 DXOS.org
//

import { Config, ConfigV1Object, mapFromKeyValues } from '@dxos/config';

import defaults from './defaults.json';
import envmap from './env-map.json';

export const BOT_CONFIG_FILENAME = 'bot.yml';

/**
 * Get config from default or specified .yml file.
 */
export const getConfig = () => {
  const config = new Config<ConfigV1Object>(
    mapFromKeyValues(envmap, process.env),
    defaults
  );

  return config;
};
