//
// Copyright 2020 DXOS.org
//

import { homedir } from 'os';
import { join } from 'path';

import { Config, mapFromKeyValues } from '@dxos/config';

// TODO(wittjosiah): Including JSON in typescript build breaks for unknown reason.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaults = require('./defaults.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const envmap = require('./env-map.json');

export const BOT_CONFIG_FILENAME = 'bot.yml';

export const BOT_BASE_DIR = join(homedir(), '.dx', 'bots');
export const BOT_OUT_DIR = join(BOT_BASE_DIR, 'out');
export const BOT_SNAPSHOT_DIR = join(BOT_BASE_DIR, 'snapshots');

export const BOT_FACTORY_DEFAULT_PERSISTENT = false;

/**
 * Get config from default or specified .yml file.
 */
export const getConfig = () => {
  const config = new Config(mapFromKeyValues(envmap, process.env), defaults);

  return config;
};
