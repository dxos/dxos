//
// Copyright 2021 DXOS.org
//

import { DefinePlugin, Compiler } from 'webpack';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export class ConfigPlugin {
  constructor(private readonly _options: ConfigPluginOpts = {}) {}

  apply(compiler: Compiler) {
    const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : this._options.dynamic ?? false;
    const define = Object.entries(definitions({ ...this._options, dynamic })).reduce((define, [key, value]) => {
      define[key] = JSON.stringify(value);
      return define;
    }, {} as { [key: string]: string });

    new DefinePlugin(define).apply(compiler);
  }
}
