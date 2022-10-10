//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'node:path';

import type { ConfigPluginOpts } from './types.cjs';

const log = debug('dxos:config:plugin');

const CWD = process.cwd();

const KEYS_TO_FILE = {
  __CONFIG_DEFAULTS__: 'dx.yml'
};

export const definitions = ({ configPath, dynamic, publicUrl }: ConfigPluginOpts) => {
  return Object.entries(KEYS_TO_FILE).reduce((prev, [key, value]) => {
    let content = {};

    try {
      content = yaml.load(readFileSync(resolve(configPath ?? CWD, value), 'utf-8')) as any;
    } catch (err: any) {
      log(`Failed to load file ${value}:`, err);
    }

    return {
      ...prev,
      [key]: content
    };
  }, {
    __DXOS_CONFIG__: { dynamic, publicUrl },
    // TODO(wittjosiah): Support for local dynamics & env overrides.
    __CONFIG_DYNAMICS__: {},
    __CONFIG_ENVS__: {}
  });
};
