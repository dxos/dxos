//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import * as process from 'process';

import { Config } from '@dxos/config';

export const loadJson = (filename: string) => {
  return yaml.load(String(fs.readFileSync(path.join(process.cwd(), filename)))) as any;
};

// TODO(burdon): Move to config.
export const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

// TODO(burdon): Use defaults.
export const getConfig = (defaultFilename = 'packages/experimental/bots/config.yml'): Config | undefined => {
  const filename = path.join(process.cwd(), process.env.TEST_CONFIG ?? defaultFilename);
  if (fs.existsSync(filename)) {
    return new Config(yaml.load(String(fs.readFileSync(filename))) as any);
  }
};
