//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';

import { DX_RUNTIME, getUnixSocket } from '@dxos/client';
import { isLocked } from '@dxos/client-services';
import { log } from '@dxos/log';

import { Daemon, ProcessInfo } from '../daemon';
import { DAEMON_START_TIMEOUT } from '../timeouts';
import { parseAddress, removeSocketFile, waitFor } from '../util';
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

    return result.map(({ uid, foreverPid, running }: ForeverProcess) => ({
      profile: uid,
      pid: foreverPid,
      running,
    }));
  }

  async start(profile: string): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      if (isLocked({ lockKey: profile, root: DX_RUNTIME })) {
        throw new Error(`Profile is locked: ${profile}`);
      }

      const logDir = path.join(this._rootDir, 'profile', profile, 'logs');
      mkdirSync(logDir, { recursive: true });
      log('starting...', { profile, logDir });

      // Run the `dx agent run` CLI command.
      // TODO(burdon): Call local run services binary directly (not via CLI)?
      forever.startDaemon(process.argv[1], {
        args: ['agent', 'run', `--profile=${profile}`, '--socket'],
        uid: profile,
        logFile: path.join(logDir, 'daemon.log'), // Forever daemon process.
        outFile: path.join(logDir, 'out.log'), // Child stdout.
        errFile: path.join(logDir, 'err.log'), // Child stderr.
      });
    }

    // TODO(burdon): Detect lock file and exit.
    // TODO(burdon): Display to user the error file.
    const { path: socketFile } = parseAddress(getUnixSocket(profile));
    await waitFor({
      condition: async () => fs.existsSync(socketFile),
      timeout: DAEMON_START_TIMEOUT,
    });

    const proc = await this._getProcess(profile);
    log.info('started', { profile: proc.profile, pid: proc.pid });
    return proc;
  }

  async stop(profile: string): Promise<ProcessInfo> {
    if (await this.isRunning(profile)) {
      forever.kill((await this._getProcess(profile)).pid!, true, 'SIGINT');
      await waitFor({
        condition: async () => !isLocked({ lockKey: profile, root: DX_RUNTIME }),
      });
    }

    await waitFor({
      condition: async () => !(await this._getProcess(profile)).profile,
    });

    removeSocketFile(profile);
    const proc = await this._getProcess(profile);
    log.info('stopped', { profile });
    return proc;
  }

  async restart(profile: string): Promise<ProcessInfo> {
    await this.stop(profile);
    return this.start(profile);
  }

  async _getProcess(profile?: string): Promise<ProcessInfo> {
    return (await this.list()).find((process) => !profile || process.profile === profile) ?? {};
  }
}
