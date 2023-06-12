//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import path from 'node:path';

import { DX_DATA } from '@dxos/client-protocol';

import { Agent, ProcessDescription } from '../agent';
import { getUnixSocket, removeSocketFile, waitForDaemon } from '../util';

const FOREVER_ROOT = `${DX_DATA}/agent/forever`;

/**
 * Manager of daemon processes started with Forever.
 */
// TODO(burdon): Rename?
export class ForeverDaemon implements Agent {
  async connect(): Promise<void> {
    initForever();
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    return (await this.list()).some((process) => process.profile === profile && process.isRunning);
  }

  async start(profile: string): Promise<ProcessDescription> {
    if (!(await this.isRunning(profile))) {
      const socket = getUnixSocket(profile);
      forever.startDaemon(process.argv[1], {
        args: ['agent', 'run', `--listen=${socket}`, '--profile=' + profile],
        uid: profile,
        logFile: path.join(FOREVER_ROOT, `${profile}-log.log`), // Path to log output from forever process (when daemonized)
        outFile: path.join(FOREVER_ROOT, `${profile}-out.log`), // Path to log output from child stdout
        errFile: path.join(FOREVER_ROOT, `${profile}-err.log`), // Path to log output from child stderr
      });
    }

    await waitForDaemon(profile);

    return this._getProcess(profile);
  }

  async stop(profile: string): Promise<ProcessDescription> {
    if (await this.isRunning(profile)) {
      forever.stop(profile);
    }
    removeSocketFile(profile);
    return this._getProcess(profile);
  }

  async restart(profile: string): Promise<ProcessDescription> {
    if ((await this._getProcess(profile)).profile === profile) {
      removeSocketFile(profile);
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

  async _getProcess(profile: string) {
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
