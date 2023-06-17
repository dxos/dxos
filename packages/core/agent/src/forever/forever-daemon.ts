//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { Daemon, ProcessInfo } from '../daemon';
import { removeSocketFile, waitFor, waitForDaemon } from '../util';

/**
 * Manager of daemon processes started with Forever.
 */
export class ForeverDaemon implements Daemon {
  private readonly _rootDir: string;

  constructor(rootDir: string) {
    this._rootDir = path.join(rootDir, 'forever');
  }

  async connect(): Promise<void> {
    forever.load({ root: this._rootDir });
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    return (await this.list()).some((process) => process.profile === profile && process.running);
  }

  async start(profile: string): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const logDir = path.join(this._rootDir, profile);
      mkdirSync(logDir, { recursive: true });

      // Run the `dx agent run` CLI command.
      // TODO(burdon): Call local run services binary directly (not via CLI).
      forever.startDaemon(process.argv[1], {
        args: ['agent', 'run', '--socket', `--profile=${profile}`],
        uid: profile,
        logFile: path.join(logDir, 'daemon.log'), // Forever daemon process.
        outFile: path.join(logDir, 'out.log'), // Child stdout.
        errFile: path.join(logDir, 'err.log'), // Child stderr.
      });
    }

    await waitForDaemon(profile);
    return this._getProcess(profile);
  }

  async stop(profile: string): Promise<ProcessInfo> {
    if (await this.isRunning(profile)) {
      forever.stop(profile);
    }

    await waitFor({
      condition: async () => !(await this._getProcess(profile)).profile,
    });

    removeSocketFile(profile);
    return this._getProcess(profile);
  }

  async restart(profile: string): Promise<ProcessInfo> {
    await this.stop(profile);
    return this.start(profile);
  }

  async list(): Promise<ProcessInfo[]> {
    const result = await new Promise<ForeverProcess[]>((resolve, reject) => {
      forever.list(false, (err, processes) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(processes ?? []);
      });
    });

    return result.map((details) => mapProcessInfo(details));
  }

  async _getProcess(profile?: string) {
    return (await this.list()).find((process) => !profile || process.profile === profile) ?? {};
  }
}

const mapProcessInfo = ({ uid, running, foreverPid }: ForeverProcess): ProcessInfo => ({
  profile: uid,
  running,
  pid: foreverPid,
});
