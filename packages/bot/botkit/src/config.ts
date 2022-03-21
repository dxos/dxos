//
// Copyright 2020 DXOS.org
//

import { homedir } from 'os';
import { join } from 'path';

import { Config, mapFromKeyValues } from '@dxos/config';

import defaults from './defaults.json';
import envmap from './env-map.json';

export const BOT_CONFIG_FILENAME = 'bot.yml';

export const BOT_OUT_DIR = join(homedir(), '.dx', 'bots', 'out');

/**
 * Get config from default or specified .yml file.
 */
export const getConfig = () => {
  const config = new Config(
    mapFromKeyValues(envmap, process.env),
    defaults
  );

  return config;
};
