//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

export const BASE_DEBUG = 'bot-factory';

export const logBot: Record<string, debug.Debugger> = new Proxy({}, {
  get: (target: any, name: string) => {
    if (!target[name]) {
      target[name] = debug(`${BASE_DEBUG}:${name}`);
    }

    return target[name];
  }
});

export const log = debug(BASE_DEBUG);
