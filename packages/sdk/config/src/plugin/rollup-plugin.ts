//
// Copyright 2022 DXOS.org
//

import { Plugin } from 'rollup';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const contents = Object.entries(definitions(options))
    .map(([key, value]) => `globalThis.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return {
    name: 'dxos-config',
    transform(code, module) {
      // Based on https://github.com/mmirca/rollup-plugin-entry-code-injector/blob/6ce979fcea31a75537c00748fbe25ed14f340624/commonjs/index.js.
      if (this.getModuleInfo(module)?.isEntry) {
        return contents + code;
      }
    }
  };
};
