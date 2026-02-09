//
// Copyright 2022 DXOS.org
//

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pkgUp from 'pkg-up';
import { parse } from 'yaml';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { setDeep } from '@dxos/util';

import { mapFromKeyValues } from '../config';

import { type ConfigPluginOpts } from './types';

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
    __CONFIG_DEFAULTS__: configPath?.length ? configPath : resolve(CWD, 'dx.yml'),
    __CONFIG_ENVS__: envPath?.length ? envPath : resolve(CWD, 'dx-env.yml'),
  } as { [key: string]: string };
  if (mode !== 'production') {
    KEYS_TO_FILE.__CONFIG_LOCAL__ = devPath ?? resolve(CWD, 'dx-local.yml');
  }

  return Object.entries(KEYS_TO_FILE).reduce(
    (prev, [key, value]) => {
      invariant(key);
      let content = {};
      try {
        content = parse(readFileSync(value, 'utf-8')) as any;

        // Map environment variables to config values.
        if (key === '__CONFIG_ENVS__') {
          content = mapFromKeyValues(content, process.env);
        }

        if (key === '__CONFIG_DEFAULTS__') {
          // Load app environment variables into default config.
          Object.entries(process.env).forEach(([key, value]) => {
            if (key.startsWith('DX_') || env?.includes(key)) {
              setDeep(content, ['runtime', 'app', 'env', key], value);
            }
          });

          // Set build info automatically if available.
          try {
            const timestamp = new Date().toISOString();
            const commitHash =
              process.env.DX_COMMIT_HASH ??
              execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).replace('\n', '');
            const packagePath = pkgUp.sync();
            const packageJson = packagePath && JSON.parse(readFileSync(packagePath, 'utf-8'));
            setDeep(content, ['runtime', 'app', 'build', 'timestamp'], timestamp);
            setDeep(content, ['runtime', 'app', 'build', 'commitHash'], commitHash);
            setDeep(content, ['runtime', 'app', 'build', 'version'], packageJson?.version);
          } catch {}
        }
      } catch (err: any) {
        if (err.message.includes('YAMLException')) {
          log.error(`Failed to parse file ${value}:`, err);
        } else {
          log(`Failed to load file ${value}:`, err);
        }

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
      __CONFIG_DEFAULTS__: {},
      __CONFIG_ENVS__: {},
      __CONFIG_LOCAL__: {},
      __DXOS_CONFIG__: { dynamic: mode === 'production', publicUrl },
    },
  );
};
