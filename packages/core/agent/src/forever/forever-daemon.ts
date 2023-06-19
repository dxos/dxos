//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';

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

  // TODO(burdon): Lock file (per profile). E.g., isRunning is false if running manually.
  //  https://www.npmjs.com/package/lockfile
  // lock(profile: string, lock = false) {
  //   const lockFile = path.join(this._rootDir, profile, 'forever.lock');
  // }

  async isRunning(profile: string): Promise<boolean> {
    return (await this.list()).some((process) => process.profile === profile && process.running);
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

  async start(profile: string): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const logDir = path.join(this._rootDir, profile, 'logs');
      mkdirSync(logDir, { recursive: true });
      log('starting...', { profile, logDir });

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
    const proc = await this._getProcess(profile);
    log('started', { profile: proc.profile, pid: proc.pid });
    return proc;
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

  private _getLockfile(profile: string) {
    return path.join(this._rootDir, profile, 'forever.lock');
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
