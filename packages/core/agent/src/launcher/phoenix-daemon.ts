//
// Copyright 2023 DXOS.org
//

import { unlinkSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path, { join } from 'node:path';

import { waitForCondition } from '@dxos/async';
import { log } from '@dxos/log';
import { Phoenix } from '@dxos/phoenix';

import { type Daemon, type ProcessInfo, type StartOptions, type StopOptions, PROFILE_FOLDER } from '../daemon';
import { CHECK_INTERVAL, DAEMON_STOP_TIMEOUT } from '../defs';
import { AgentIsNotStartedByCLIError, AgentWaitTimeoutError } from '../errors';
import { lockFilePath, removeLockFile, removeSocketFile, waitForAgentToStart } from '../util';

/**
 * Manager of daemon processes started with @dxos/phoenix.
 */
export class PhoenixDaemon implements Daemon {
  constructor(private readonly _rootDir: string) {
    const dir = join(this._rootDir, PROFILE_FOLDER);
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
    return await isLocked(lockFilePath(profile));
  }

  async list(): Promise<ProcessInfo[]> {
    const profiles = (await readdir(join(this._rootDir, PROFILE_FOLDER))).filter((uid) => !uid.startsWith('.'));

    return Promise.all(
      profiles.map(async (profile) => {
        return this._getProcess(profile);
      }),
    );
  }

  async start(profile: string, options?: StartOptions): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const logDir = path.join(this._rootDir, PROFILE_FOLDER, profile, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      log('starting...', { profile, logDir });

      const logFile = path.join(logDir, 'daemon.log');
      const errFile = path.join(logDir, 'err.log');
      const lockFile = lockFilePath(profile);

      // Clear err file.
      if (existsSync(errFile)) {
        unlinkSync(errFile);
      }

      // Clear staled files.
      removeSocketFile(profile);
      removeLockFile(profile);

      // Run the `dx agent run` CLI command.
      // https://github.com/foreversd/forever-monitor
      // TODO(burdon): Call local run services binary directly (not via CLI)?
      await Phoenix.start({
        command: process.argv[1],
        args: [
          'agent',
          'start',
          '--foreground',
          `--profile=${profile}`,
          options?.metrics ? '--metrics' : undefined,
          options?.config ? `--config=${options.config}` : undefined,
          options?.ws ? `--ws=${options.ws}` : undefined,
        ].filter(Boolean) as string[],
        // TODO(burdon): Make optional.
        env: {
          LOG_FILTER: process.env.LOG_FILTER,
          ...process.env,
        },
        profile,
        maxRestarts: 0,
        pidFile: lockFile,
        logFile,
        errFile,
      });

      try {
        await waitForAgentToStart(profile);
      } catch (err) {
        log.warn('Failed to start daemon.');
        const errContent = readFileSync(errFile, 'utf-8');
        log.error(errContent);
        await this.stop(profile);
        throw err;
      }
    }

    return await this._getProcess(profile);
  }

  async stop(profile: string, { force = false }: StopOptions = {}): Promise<ProcessInfo | undefined> {
    const proc = await this._getProcess(profile);

    if (
      (await this.isRunning(profile)) &&
      existsSync(lockFilePath(profile)) &&
      !readFileSync(lockFilePath(profile), 'utf-8').includes('pid')
    ) {
      throw new AgentIsNotStartedByCLIError();
    }

    if (existsSync(lockFilePath(profile)) && readFileSync(lockFilePath(profile), 'utf-8').includes('pid')) {
      await Phoenix.stop(lockFilePath(profile), force);
    }

    await waitForCondition({
      condition: async () => !(await this.isRunning(profile)),
      timeout: DAEMON_STOP_TIMEOUT,
      interval: CHECK_INTERVAL,
      error: new AgentWaitTimeoutError(),
    });

    return proc;
  }

  async restart(profile: string, options?: StartOptions & StopOptions): Promise<ProcessInfo> {
    await this.stop(profile, options);
    return this.start(profile, options);
  }

  async _getProcess(profile: string): Promise<ProcessInfo> {
    let info = { profile, running: await this.isRunning(profile) };
    try {
      info = { ...info, ...Phoenix.info(lockFilePath(profile)) };
    } catch (err) {
      log.warn('Could not get process info', { err });
    }
    return info;
  }
}
