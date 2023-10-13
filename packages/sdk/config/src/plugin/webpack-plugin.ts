//
// Copyright 2021 DXOS.org
//

import { DefinePlugin, type Compiler } from 'webpack';

import { definitions } from './definitions';
import { type ConfigPluginOpts } from './types';

export class ConfigPlugin {
  constructor(private readonly _options: ConfigPluginOpts = {}) {}

  apply(compiler: Compiler) {
    const define = Object.entries(definitions({ ...this._options, mode: process.env.NODE_ENV })).reduce(
      (define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      },
      {} as { [key: string]: string },
    );

    new DefinePlugin(define).apply(compiler);
  }
}
