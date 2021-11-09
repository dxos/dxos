//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { Config, mapFromKeyValues } from '@dxos/config';
import { createId, createKeyPair, keyToString } from '@dxos/crypto';

import defaults from './defaults.json';
import envmap from './env-map.json';

export const BOT_CONFIG_FILENAME = 'bot.yml';

/**
 * Get config from default or specified .yml file.
 */
export const getConfig = () => {
  const keyPair = createKeyPair();

  const config = new Config(
    mapFromKeyValues(envmap, process.env),
    defaults,
    {
      bot: {
        peerId: createId(),
        topic: keyToString(keyPair.publicKey),
        secretKey: keyToString(keyPair.secretKey)
      }
    }
  );

  return config;
};

export const getClientConfig = (config: any) => {
  const { client = {}, services: { signal: { server }, ice } } = config.values;
  const clientConf = {
    swarm: {
      signal: server,
      ice
    }
  };
  return defaultsDeep({}, clientConf, client);
};
