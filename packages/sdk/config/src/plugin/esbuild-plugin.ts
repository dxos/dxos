//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import type { Plugin } from 'esbuild';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import assert from 'node:assert';
import { resolve } from 'path';

const log = debug('dxos:config:plugin');

const CWD = process.cwd();

const KEYS_TO_FILE = {
  __CONFIG_DEFAULTS__: 'dx.yml'
};

export interface ConfigPluginOpts {
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

// TODO(wittjosiah): Test config plugin properly injects config when used with loaders.
export const ConfigPlugin = ({ dynamic = false, publicUrl = '' }: ConfigPluginOpts = {}): Plugin => {
  dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : dynamic;
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  return {
    name: 'dxos-config',
    setup: ({ onResolve, onLoad }) => {
      onResolve(
        { filter: /loaders$/ },
        args => ({ path: require.resolve('./loaders/browser-esbuild', { paths: [args.resolveDir] }) })
      );

      onResolve(
        { filter: /^dxos-config-globals$/ },
        () => ({ path: 'dxos-config-globals', namespace: 'dxos-config' })
      );

      const definitions = Object.entries(KEYS_TO_FILE).reduce((prev, [key, value]) => {
        let content = {};

        try {
          content = yaml.load(readFileSync(resolve(CWD, value), 'utf-8')) as any;
        } catch (error: any) {
          log(`Failed to load file ${value}:`, error);
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

      onLoad({ filter: /^dxos-config-globals$/, namespace: 'dxos-config' }, () => ({
        resolveDir: CWD,
        contents: Object.entries(definitions).map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`).join('\n')
      }));
    }
  };
};
