//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import path from 'node:path';

import { Daemon, ProcessDescription } from '../daemon';

const FOREVER_ROOT = `${process.env.HOME}/.dx/store/forever`;

export class ForeverDaemon implements Daemon {
  async connect(): Promise<void> {
    initForever();
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile = 'default'): Promise<boolean> {
    return (await this.list()).some((process) => process.profile === profile && process.isRunning);
  }

  async start(profile = 'default'): Promise<ProcessDescription> {
    if (!(await this.isRunning(profile))) {
      forever.startDaemon(process.argv[1], {
        args: ['daemon', 'run', `--listen=unix://${process.env.HOME}/.dx/run/${profile}.sock`, '--profile=' + profile],
        uid: profile,
        logFile: path.join(FOREVER_ROOT, `${profile}-log.log`), // Path to log output from forever process (when daemonized)
        outFile: path.join(FOREVER_ROOT, `${profile}-out.log`), // Path to log output from child stdout
        errFile: path.join(FOREVER_ROOT, `${profile}-err.log`), // Path to log output from child stderr
      });
    }

    return this._getProcess(profile);
  }

  async stop(profile = 'default'): Promise<ProcessDescription> {
    forever.stop(profile);
    return this._getProcess(profile);
  }

  async restart(profile = 'default'): Promise<ProcessDescription> {
    if ((await this._getProcess(profile)).profile === profile) {
      forever.restart(profile);
    } else {
      await this.start(profile);
    }

    return await this._getProcess(profile);
  }

  async list(): Promise<ProcessDescription[]> {
    const result = await new Promise<ForeverProcess[]>((resolve, reject) => {
      forever.list(false, (err, processes) => {
        if (err) {
          reject(err);
        }
        resolve(processes ?? []);
      });
    });
    return result.map((details) => foreverToProcessDescription(details));
  }

  async _getProcess(profile = 'default') {
    return (await this.list()).find((process) => process.profile === profile) ?? {};
  }
}

const foreverToProcessDescription = (details: ForeverProcess): ProcessDescription => ({
  profile: details?.uid,
  isRunning: details?.running,
  pid: details?.foreverPid,
});

const initForever = () => {
  forever.load({ root: FOREVER_ROOT });
};
