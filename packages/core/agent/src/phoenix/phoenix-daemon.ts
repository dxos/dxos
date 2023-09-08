//
// Copyright 2023 DXOS.org
//

import { unlinkSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { SystemStatus, fromAgent, getUnixSocket } from '@dxos/client/services';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DaemonManager, ProcessInfo as PhoenixProcess } from '@dxos/phoenix';

import { Daemon, ProcessInfo, StartOptions, StopOptions } from '../daemon';
import { CHECK_INTERVAL, DAEMON_START_TIMEOUT, DAEMON_STOP_TIMEOUT } from '../defs';
import { AgentWaitTimeoutError } from '../errors';
import { parseAddress, removeSocketFile } from '../util';

/**
 * Manager of daemon processes started with @dxos/phoenix.
 */
export class PhoenixDaemon implements Daemon {
  private readonly _phoenix: DaemonManager;
  constructor(private readonly _rootDir: string) {
    this._phoenix = new DaemonManager(this._rootDir);
  }

  async connect(): Promise<void> {
    // no-op.
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    return this._phoenix.isRunning(profile);
  }

  async list(): Promise<ProcessInfo[]> {
    return (await this._phoenix.list()).map(phoenixInfoToProcessInfo);
  }

  async start(profile: string, options?: StartOptions): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const logDir = path.join(this._rootDir, 'profile', profile, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      log('starting...', { profile, logDir });

      const logFile = path.join(logDir, 'daemon.log');
      const errFile = path.join(logDir, 'err.log');

      // Clear err file.
      if (existsSync(errFile)) {
        unlinkSync(errFile);
      }

      // Run the `dx agent run` CLI command.
      // https://github.com/foreversd/forever-monitor
      // TODO(burdon): Call local run services binary directly (not via CLI)?
      await this._phoenix.start({
        command: process.argv[1],
        args: [
          'agent',
          'start',
          '--foreground',
          `--profile=${profile}`,
          options?.metrics ? '--metrics' : undefined,
          options?.config ? `--config=${options.config}` : undefined,
        ].filter(Boolean) as string[],
        // TODO(burdon): Make optional.
        env: {
          LOG_FILTER: process.env.LOG_FILTER,
        },
        uid: profile,
        maxRestarts: 0,
        logFile,
        errFile,
      });

      try {
        // Wait for socket file to appear.
        {
          await waitForCondition({
            condition: () => existsSync(parseAddress(getUnixSocket(profile)).path),
            timeout: DAEMON_START_TIMEOUT,
            interval: CHECK_INTERVAL,
            error: new AgentWaitTimeoutError(),
          });
        }

        // Check if agent is initialized.
        {
          const services = fromAgent({ profile });
          await services.open(new Context());

          const trigger = new Trigger();
          const stream = services.services.SystemService!.queryStatus({});
          stream.subscribe(({ status }) => {
            invariant(status === SystemStatus.ACTIVE);
            trigger.wake();
          });
          await asyncTimeout(trigger.wait(), DAEMON_START_TIMEOUT);

          await stream.close();
          await services.close(new Context());
        }
        return await this._getProcess(profile);
      } catch (err) {
        log.warn('Failed to start daemon.');
        const errContent = readFileSync(errFile, 'utf-8');
        log.error(errContent);
        await this.stop(profile);
        throw err;
      }
    }

    const proc = await this._getProcess(profile);
    log('started', { proc });
    return proc;
  }

  async stop(profile: string, { force = false }: StopOptions = {}): Promise<ProcessInfo | undefined> {
    const proc = await this._getProcess(profile);

    await this._phoenix.stop(profile, force);

    await waitForCondition({
      condition: async () => !(await this.isRunning(profile)),
      timeout: DAEMON_STOP_TIMEOUT,
      interval: CHECK_INTERVAL,
      error: new AgentWaitTimeoutError(),
    });

    removeSocketFile(profile);
    return proc;
  }

  async restart(profile: string, options?: StartOptions & StopOptions): Promise<ProcessInfo> {
    await this.stop(profile, options);
    return this.start(profile, options);
  }

  async _getProcess(profile: string): Promise<ProcessInfo> {
    return phoenixInfoToProcessInfo(await this._phoenix.getInfo(profile));
  }
}

const phoenixInfoToProcessInfo = (info: PhoenixProcess): ProcessInfo => {
  return { profile: info.uid, started: info.timestamp, ...info };
};
