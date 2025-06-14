//
// Copyright 2023 DXOS.org
//

import { existsSync, mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { waitForCondition } from '@dxos/async';
import { log } from '@dxos/log';

import { type Runner } from './runner';
import { type Daemon, type ProcessInfo, type StartOptions, type StopOptions, PROFILE_FOLDER } from '../daemon';
import { CHECK_INTERVAL, DAEMON_STOP_TIMEOUT } from '../defs';
import { AgentWaitTimeoutError } from '../errors';
import { lockFilePath, removeLockFile, removeSocketFile, waitForAgentToStart } from '../util';

/**
 * Manager of system daemon processes using system service manager.
 */
export class SystemDaemon implements Daemon {
  constructor(
    private readonly _rootDir: string,
    private readonly _runner: Runner,
  ) {
    const dir = path.join(this._rootDir, PROFILE_FOLDER);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    // no-op.
  }

  async disconnect(): Promise<void> {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    const { isLocked } = await import('@dxos/client-services');
    return (await isLocked(lockFilePath(profile))) || this._runner.isRunning(profile);
  }

  async list(): Promise<ProcessInfo[]> {
    const profiles = (await readdir(path.join(this._rootDir, PROFILE_FOLDER))).filter((uid) => !uid.startsWith('.'));

    return Promise.all(
      profiles.map(async (profile) => {
        const running = await this.isRunning(profile);
        return { profile, running, ...(running && (await this._runner.info(profile))) };
      }),
    );
  }

  async start(profile: string, options?: StartOptions): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const profileDir = path.join(this._rootDir, PROFILE_FOLDER, profile);

      const logDir = path.join(profileDir, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      log('starting...', { profile, logDir });

      // Clear staled files.
      removeSocketFile(profile);
      removeLockFile(profile);

      const logFile = path.join(logDir, 'daemon.log');
      const errFile = path.join(logDir, 'err.log');

      await this._runner.start({ profile, errFile, logFile, daemonOptions: options });

      try {
        await waitForAgentToStart(profile, options?.timeout);
      } catch (err) {
        log.warn('Failed to start daemon.');
        await this.stop(profile);
        throw err;
      }
    }

    return { profile, running: true };
  }

  async stop(profile: string, { force = false }: StopOptions = {}): Promise<ProcessInfo | undefined> {
    if (await this._runner.isRunning(profile)) {
      log('stopping...', { profile });

      await this._runner.stop(profile, force);

      await waitForCondition({
        condition: async () => !(await this.isRunning(profile)),
        timeout: DAEMON_STOP_TIMEOUT,
        interval: CHECK_INTERVAL,
        error: new AgentWaitTimeoutError(),
      });
    }

    return { profile, running: false };
  }

  async restart(profile: string, options?: StartOptions & StopOptions): Promise<ProcessInfo> {
    await this.stop(profile, options);
    return this.start(profile, options);
  }
}
