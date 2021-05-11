//
// Copyright 2020 DXOS.
//

import { resolve } from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { DefinePlugin, NormalModuleReplacementPlugin } from 'webpack';

import { mapFromKeyValues } from './config';

const DEFAULT_PATH = resolve(process.cwd(), 'config');

const KEYS_TO_FILE = {
  __CONFIG_DEFAULTS__: 'defaults.yml',
  __CONFIG_ENVS__: 'envs-map.yml',
  __CONFIG_DYNAMICS__: 'config.yml'
};

export class ConfigPlugin {
  constructor ({ path = DEFAULT_PATH, dynamic = false } = {}) {
    this._path = path;
    this._dynamic = dynamic;
  }

  /**
   * @param {Compiler} compiler webpack compiler instance
   * @returns {void}
   */
  apply (compiler) {
    // Grab info from compiler, and set a __DXOS_CONFIG__ with { publicUrl, useLocal }. Add to generated keys.
    // Append the generated keys to DefinePlugin (see constructor)
    // Use Context Replacement to use loaders/browser
    const definitions = Object.entries(KEYS_TO_FILE).reduce((prev, [key, value]) => {
      let content = {};
      try {
        content = yaml.load(fs.readFileSync(resolve(this._path, value)));

        if (value === 'envs-map.yml') {
          content = mapFromKeyValues(content, process.env);
        }
      } catch (error) {
        // compiler.hooks.thisCompilation.tap('ConfigPlugin', compilation => {
        //   const error = new WebpackError(`
        //   `)
        //   error.name = 'EnvVariableNotDefinedError';
        //   compilation.errors.push(error);
        // });
      }
      return {
        ...prev,
        [key]: JSON.stringify(content)
      };
    }, { __DXOS_CONFIG__: JSON.stringify({ dynamic: this._dynamic, publicUrl: compiler.options.output.publicPath }) });

    new DefinePlugin(definitions).apply(compiler);
    new NormalModuleReplacementPlugin(/[/\\]loaders[/\\]index.js/, './browser.js').apply(compiler);
  }
}
