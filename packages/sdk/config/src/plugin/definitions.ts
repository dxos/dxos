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

export const definitions = ({ configPath, envPath, devPath, dynamic, publicUrl = '', env }: ConfigPluginOpts) => {
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
        log.warn(`Failed to load file ${value}`);
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
