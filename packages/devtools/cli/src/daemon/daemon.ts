//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import { promisify } from 'node:util';
import { Proc } from 'pm2';

import { Pm2, getPm2 } from './pm2';

const DEFAULT_PROFILE = 'default';

export class Daemon {
  private _pm2?: Pm2;

  async init() {
    this._pm2 = await getPm2();
  }

  disconnect() {
    assert(this._pm2);
    this._pm2.disconnect();
  }

  async isRunning(profile = DEFAULT_PROFILE) {
    assert(this._pm2);
    const description = await promisify(this._pm2.describe.bind(this._pm2))(profile);
    if (
      description.length === 0 ||
      !description[0].monit ||
      (!description[0].monit.cpu && !description[0].monit.memory)
    ) {
      return false;
    }

    return true;
  }

  async start(profile = DEFAULT_PROFILE) {
    return new Promise<Proc[]>((resolve, reject) => {
      assert(this._pm2);
      this._pm2.start(
        {
          script: process.argv[1],
          args: [
            'daemon',
            'run',
            `--listen=unix://${process.env.HOME}/.dx/run/${profile}.sock`,
            '--profile=' + profile,
          ],
          name: profile,
        },
        (err, proc) => {
          if (err) {
            reject(err);
          } else {
            // Return type does not equal to runtime return type im PM2.
            resolve(proc! as Proc[]);
          }
        },
      );
    });
  }

  async stop(profile = DEFAULT_PROFILE) {
    assert(this._pm2);
    return promisify(this._pm2.stop.bind(this._pm2))(profile);
  }

  async list() {
    assert(this._pm2);
    const list = await promisify(this._pm2.list.bind(this._pm2))();
    return list.map((proc) => ({
      name: proc.name,
      pid: proc.pid,
      cpu: proc.monit?.cpu,
      memory: proc.monit?.memory,
    }));
  }
}
