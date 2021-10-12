//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';

const DEFAULT_PATH = resolve(process.cwd(), 'config');

const KEYS_TO_FILE = {
  __CONFIG_DEFAULTS__: 'defaults.yml',
  __CONFIG_DYNAMICS__: 'config.yml'
};

export function ConfigPlugin (): Plugin {
  return {
    name: 'dxos-config',
    setup: ({ onResolve, onLoad, initialOptions }) => {
      onResolve({ filter: /loaders\/index$/ }, args => ({ path: require.resolve('@dxos/config/dist/src/loaders/browser', { paths: [args.resolveDir]}) }))

      const injected = [
        resolve(__dirname, 'configGlobal.js')
      ]

      if (initialOptions.inject) {
        initialOptions.inject.push(...injected);
      } else {
        initialOptions.inject = [...injected];
      }

      onResolve({ filter: /^dxos-config-globals$/, }, () => ({ path: 'dxos-config-globals', namespace: 'dxos-config' }))

      const definitions = Object.entries(KEYS_TO_FILE).reduce((prev, [key, value]) => {
        let content = {};

        try {
          content = yaml.load(readFileSync(resolve(DEFAULT_PATH, value), 'utf-8'));
        } catch (error) {
          console.error(error)
        }

        return {
          ...prev,
          [key]: content
        };
      }, {
        __DXOS_CONFIG__: { dynamic: false, publicUrl: '' },
        __CONFIG_ENVS__: {}
      })


      onLoad({ filter: /^dxos-config-globals$/, namespace: 'dxos-config' }, () => ({
        resolveDir: __dirname,
        contents: Object.entries(definitions).map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`).join('\n'),
      }))
    }
  };
}
