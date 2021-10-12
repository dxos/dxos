//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import crypto from 'crypto';
import dotenv from 'dotenv';
import download from 'download';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import yaml from 'js-yaml';
import { tmpdir } from 'os';
import path from 'path';

import { Config, mapFromKeyValues, mapToKeyValues } from '@dxos/config';

import envmap from './env-map.json';

dotenv.config();

const PROFILE_PATH = path.join(tmpdir(), `${crypto.randomBytes(4).toString('hex')}.yml`);

export const FACTORY_OUT_DIR = './out';
export const FACTORY_BOT_DIR = '.bots';

// Config to override.
export const OVERRIDE_CONFIG = {
  DX_SIGNAL_ENDPOINT: 'ws://localhost:4999'
};

export const getTestConfig = async () => {
  if (!existsSync(PROFILE_PATH)) {
    // TODO(egorgripasov): DX_PROFILE_URL.
    assert(process.env.WIRE_PROFILE_URL, 'Missing WIRE_PROFILE_URL environment variable.');
    writeFileSync(PROFILE_PATH, await download(process.env.WIRE_PROFILE_URL));
  }

  const profileConfig = yaml.load(String(readFileSync(PROFILE_PATH)));

  const config = new Config(
    mapFromKeyValues(envmap, OVERRIDE_CONFIG),
    profileConfig
  );

  return config;
};

export const mapConfigToEnv = (config: any) => {
  return mapToKeyValues(envmap, config.values);
};
