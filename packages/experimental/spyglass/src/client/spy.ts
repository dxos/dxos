//
// Copyright 2022 DXOS.org
//

import http from 'http';

import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { Command, defaultConfig, Message } from '../common';

/**
 * Posts logs to server.
 */
export class Spy {
  static humanize (key: PublicKey) {
    return humanize(key);
  }

  constructor (
    private readonly _config = defaultConfig
  ) {}

  async clear () {
    await this._post({ cmd: Command.CLEAR });
    return this;
  }

  async log (message: Message) {
    await this._post({ cmd: Command.LOG, data: message });
    return this;
  }

  async _post (data: any) {
    await new Promise<void>((resolve, reject) => {
      const { hostname, port, path } = this._config;

      const json = JSON.stringify(data);
      const request = http.request({
        hostname,
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(json)
        }
      }, () => {
        console.log('ok');
        resolve();
      });

      request.on('error', err => {
        reject(err);
      });

      request.write(json);
      request.end();
    });
  }
}
