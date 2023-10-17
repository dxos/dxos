//
// Copyright 2023 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import * as process from 'node:process';

import { Config } from '@dxos/config';
import { invariant } from '@dxos/invariant';

export const loadJson = (filename: string) => {
  invariant(filename, 'Invalid path');
  return yaml.load(String(fs.readFileSync(path.join(process.cwd(), filename)))) as any;
};

// TODO(burdon): Move to config.
export const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

// TODO(burdon): Use defaults.
export const getConfig = (defaultFilename = 'config.yml'): Config | undefined => {
  const filename = path.join(process.cwd(), process.env.TEST_CONFIG ?? defaultFilename);
  if (fs.existsSync(filename)) {
    return new Config(yaml.load(String(fs.readFileSync(filename))) as any);
  }
};

// TODO(burdon): Full text search utils?
export const stringMatch = (text: string, prefix = false) => {
  const match = text.toLowerCase();
  return prefix
    ? (value: string) => value.toLowerCase().indexOf(match) !== -1
    : (value: string) => value.toLowerCase() === match;
};
