//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'node:path';

import { mapFromKeyValues } from '../config';
import { ConfigPluginOpts } from './types';

const log = debug('dxos:config:plugin');

const CWD = process.cwd();

export const definitions = ({
  configPath,
  envPath,
  devPath,
  dynamic,
  publicUrl = ''
}: ConfigPluginOpts) => {
  const KEYS_TO_FILE = {
    __CONFIG_DEFAULTS__: configPath ?? resolve(CWD, 'dx.yml'),
    __CONFIG_ENVS__: envPath ?? resolve(CWD, 'dx-env.yml'),
    // Dev config is supplied in place of dynamics locally.
    // When deployed with dynamic=true it is overridden by KUBE config.
    __CONFIG_DYNAMICS__: devPath ?? resolve(CWD, 'dx-dev.yml')
  };

  return Object.entries(KEYS_TO_FILE).reduce(
    (prev, [key, value]) => {
      let content = {};

      try {
        content = yaml.load(readFileSync(value, 'utf-8')) as any;

        if (key === '__CONFIG_ENVS__') {
          content = mapFromKeyValues(content, process.env);
        }
      } catch (err: any) {
        log(`Failed to load file ${value}:`, err);
      }

      return {
        ...prev,
        [key]: content
      };
    },
    {
      __DXOS_CONFIG__: { dynamic, publicUrl }
    }
  );
};
