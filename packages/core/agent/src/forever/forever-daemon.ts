//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import path from 'node:path';

import { Agent, ProcessDescription } from '../agent';
import { getUnixSocket, removeSocketFile, waitFor, waitForDaemon } from '../util';

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
        args: ['agent', 'run', `--listen=${socket}`, '--profile=' + profile],
        uid: profile,
        logFile: path.join(this._rootDir, `${profile}-log.log`), // Path to log output from forever process (when daemonized)
        outFile: path.join(this._rootDir, `${profile}-out.log`), // Path to log output from child stdout
        errFile: path.join(this._rootDir, `${profile}-err.log`), // Path to log output from child stderr
      });
    }

    await waitForDaemon(profile);

    return this._getProcess(profile);
  }

  async stop(profile: string): Promise<ProcessDescription> {
    if (await this.isRunning(profile)) {
      forever.stop(profile);
    }

    await waitFor({
      condition: async () => !(await this._getProcess(profile)).profile,
    });

    removeSocketFile(profile);
    return this._getProcess(profile);
  }

  async restart(profile: string): Promise<ProcessDescription> {
    await this.stop(profile);
    return this.start(profile);
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
