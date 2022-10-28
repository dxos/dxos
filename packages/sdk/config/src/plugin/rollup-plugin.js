//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { definitions } from './definitions';

export function ConfigPlugin(options = {}) {
  const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : options.dynamic ?? false;
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  const contents = Object.entries(definitions({ ...options, dynamic }))
    .map(([key, value]) => `globalThis.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return {
    name: 'dxos-config',
    transform(code, module) {
      // Based on https://github.com/mmirca/rollup-plugin-entry-code-injector/blob/6ce979fcea31a75537c00748fbe25ed14f340624/commonjs/index.js.
      if (this.getModuleInfo(module).isEntry) {
        return contents + code;
      }
    }
  };
}
