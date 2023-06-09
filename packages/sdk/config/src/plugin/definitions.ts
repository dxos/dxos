//
// Copyright 2022 DXOS.org
//

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import set from 'lodash.set';
import { resolve } from 'node:path';
import pkgUp from 'pkg-up';

import { log } from '@dxos/log';

import { mapFromKeyValues } from '../config';
import { ConfigPluginOpts } from './types';

const CWD = process.cwd();

export const definitions = ({
  configPath,
  envPath,
  devPath,
  mode = process.env.NODE_ENV,
  publicUrl = '',
  env,
}: ConfigPluginOpts) => {
  const KEYS_TO_FILE = {
    __CONFIG_DEFAULTS__: configPath ?? resolve(CWD, 'dx.yml'),
    __CONFIG_ENVS__: envPath ?? resolve(CWD, 'dx-env.yml'),
  } as { [key: string]: string };

  if (mode !== 'production') {
    KEYS_TO_FILE.__CONFIG_LOCAL__ = devPath ?? resolve(CWD, 'dx-local.yml');
  }

  return Object.entries(KEYS_TO_FILE).reduce(
    (prev, [key, value]) => {
      let content = {};

      try {
        content = yaml.load(readFileSync(value, 'utf-8')) as any;

        // Map environment variables to config values.
        if (key === '__CONFIG_ENVS__') {
          content = mapFromKeyValues(content, process.env);
        }

        if (key === '__CONFIG_DEFAULTS__') {
          // Load app environment variables into default config.
          env?.map((key) => set(content, ['runtime', 'app', 'env', key], process.env[key]));

          // Set build info automatically if available.
          try {
            const timestamp = new Date().toISOString();
            const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).replace('\n', '');
            const packagePath = pkgUp.sync();
            const packageJson = packagePath && JSON.parse(readFileSync(packagePath, 'utf-8'));
            set(content, ['runtime', 'app', 'build', 'timestamp'], timestamp);
            set(content, ['runtime', 'app', 'build', 'commitHash'], commitHash);
            set(content, ['runtime', 'app', 'build', 'version'], packageJson?.version);
          } catch {}
        }
      } catch (err: any) {
        log(`Failed to load file ${value}:`, err);

        if (key === '__CONFIG_DEFAULTS__') {
          // Default config is required.
          throw new Error(`Failed to load default config file from ${value}`);
        }
      }

      return {
        ...prev,
        [key]: content,
      };
    },
    {
      __DXOS_CONFIG__: { dynamic: mode === 'production', publicUrl },
      __CONFIG_DEFAULTS__: {},
      __CONFIG_ENVS__: {},
      __CONFIG_LOCAL__: {},
    },
  );
};
