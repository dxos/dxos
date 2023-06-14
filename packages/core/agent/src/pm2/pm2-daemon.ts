//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import path from 'node:path';
import { promisify } from 'node:util';
import pm2, { Proc } from 'pm2';

import { Trigger } from '@dxos/async';
import { getUnixSocket } from '@dxos/client';

import { Agent, ProcessDescription } from '../agent';

/**
 * Manager of daemon processes started with PM2.
 *
 * @deprecated because stalls process after command finishes.
 */
export class Pm2Daemon implements Agent {
  private readonly _rootDir: string;
  private _pm2?: Pm2;

  constructor(rootDir: string) {
    this._rootDir = path.join(rootDir, 'pm2');
  }

  async connect() {
    this._pm2 = await getPm2(this._rootDir);
  }

  async disconnect() {
    assert(this._pm2);
    this._pm2.disconnect();
  }

  async isRunning(profile: string) {
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

  async start(profile: string) {
    const result = await new Promise<Proc[]>((resolve, reject) => {
      assert(this._pm2);
      this._pm2.start(
        {
          script: process.argv[1],
          args: ['agent', 'run', `--listen=${getUnixSocket(profile)}`, '--profile=' + profile],
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

    if (result.length === 0) {
      return {};
    }

    return procToProcessDescription(result[0]);
  }

  async stop(profile: string) {
    assert(this._pm2);
    const result = await promisify(this._pm2.stop.bind(this._pm2))(profile);
    return procToProcessDescription(result);
  }

  async restart(profile: string) {
    assert(this._pm2);
    if (await this.isRunning(profile)) {
      return procToProcessDescription(await promisify(this._pm2.restart.bind(this._pm2))(profile));
    }

    return this.start(profile);
  }

  async list() {
    assert(this._pm2);
    const list = await promisify(this._pm2.list.bind(this._pm2))();
    return list.map((proc) => ({
      profile: proc.name,
      pid: proc.pid,
      isRunning: !!proc.monit?.cpu || !!proc.monit?.memory,
    }));
  }
}

const procToProcessDescription = (proc: Proc): ProcessDescription => ({
  profile: proc.name,
  pid: proc.pm_id,
});

type Pm2Params = {
  cwd?: string; // * @param {String}  [opts.cwd=<current>]         override pm2 cwd for starting scripts
  pm2_home?: string; // * @param {String}  [opts.pm2_home=[<paths.js>]] pm2 directory for log, pids, socket files
  independent?: boolean; // * @param {Boolean} [opts.independent=false]     unique PM2 instance (random pm2_home)
  daemon_mode?: boolean; // * @param {Boolean} [opts.daemon_mode=true]      should be called in the same process or not
  public_key?: string; // * @param {String}  [opts.public_key=null]       pm2 plus bucket public key
  secret_key?: string; // * @param {String}  [opts.secret_key=null]       pm2 plus bucket secret key
  machine_name?: string; // * @param {String}  [opts.machine_name=null]     pm2 plus instance name
};

type Pm2 = typeof pm2;

const Pm2Api: new (params?: Pm2Params) => Pm2 = (pm2 as any).custom;

const getPm2 = async (rootDir: string) => {
  const instance = new Pm2Api({
    pm2_home: `${rootDir}/pm2`,
  });

  const connected = new Trigger();
  instance.connect((err) => {
    if (err) {
      connected.throw(err);
    } else {
      connected.wake();
    }
  });

  await connected;

  return instance;
};
