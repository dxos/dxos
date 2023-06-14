//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import path from 'node:path';

import { getUnixSocket } from '@dxos/client';

import { Agent, ProcessDescription } from '../agent';
import { removeSocketFile, waitForDaemon } from '../util';

/**
 * Manager of daemon processes started with Forever.
 */
export class ForeverDaemon implements Agent {
  private readonly _rootDir: string;

  constructor(rootDir: string) {
    this._rootDir = path.join(rootDir, 'forever');
  }

  async connect(): Promise<void> {
    initForever(this._rootDir);
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
        args: ['agent', 'run', `--listen=${socket}`, `--profile=${profile}`],
        uid: profile,
        // TODO(burdon): log vs out?
        logFile: path.join(this._rootDir, 'daemon.log'), // Forever process (when daemonized).
        outFile: path.join(this._rootDir, 'process-out.log'), // Child stdout.
        errFile: path.join(this._rootDir, 'process-err.log'), // Child stderr.
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
          return;
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

const initForever = (rootDir: string) => {
  forever.load({ root: rootDir });
};
