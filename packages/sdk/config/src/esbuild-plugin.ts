//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import type { Plugin } from 'esbuild';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'path';

const CWD = process.cwd();
const DEFAULT_PATH = resolve(CWD, 'config');

const KEYS_TO_FILE = {
  __CONFIG_DEFAULTS__: 'defaults.yml',
  __CONFIG_DYNAMICS__: 'config.yml'
};

export interface ConfigPluginOpts {
  /**
   * Path to the directory with config files.
   * @default './config'
   */
  configPath?: string

  /**
   * The Dynamics() config.yml file is special, it will be loaded if the dynamic property is set to false.
   * If dynamic is set to true each app will try to load from an endpoint (using {publicUrl}/config/config.json),
   * wire app serve adds config endpoints for each app serving the global config file (~/.wire/remote.yml).
   *
   * The usual pattern is to set it to CONFIG_DYNAMIC env variable.
   * When running app locally this should be set to false or nil to serve local config.
   * And when publishing the app to DXNS the cli-app will set that variable to true automatically.
   *
   * @default false
   */
  dynamic?: boolean

  /**
   * Public URL of the published app. Also used to load the dynamic config.
   *
   * @default ''
   */
  publicUrl?: string
}

export function ConfigPlugin ({ configPath = DEFAULT_PATH, dynamic = false, publicUrl = '' }: ConfigPluginOpts = {}): Plugin {
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  return {
    name: 'dxos-config',
    setup: ({ onResolve, onLoad }) => {
      onResolve(
        { filter: /loaders\/index$/ },
        args => ({ path: require.resolve('./loaders/browser-esbuild', { paths: [args.resolveDir] }) })
      );

      onResolve(
        { filter: /^dxos-config-globals$/ },
        () => ({ path: 'dxos-config-globals', namespace: 'dxos-config' })
      );

      const definitions = Object.entries(KEYS_TO_FILE).reduce((prev, [key, value]) => {
        let content = {};

        try {
          content = yaml.load(readFileSync(resolve(configPath, value), 'utf-8'));
        } catch (error) {
          console.error(error);
        }

        return {
          ...prev,
          [key]: content
        };
      }, {
        __DXOS_CONFIG__: { dynamic, publicUrl },
        __CONFIG_ENVS__: {}
      });

      onLoad({ filter: /^dxos-config-globals$/, namespace: 'dxos-config' }, () => ({
        resolveDir: CWD,
        contents: Object.entries(definitions).map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`).join('\n')
      }));
    }
  };
}
