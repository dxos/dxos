//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import assert from 'node:assert';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { SystemStatus, fromAgent, getUnixSocket } from '@dxos/client/services';
import { log } from '@dxos/log';

import { Daemon, ProcessInfo, StartOptions, StopOptions } from '../daemon';
import { CHECK_INTERVAL, DAEMON_START_TIMEOUT, DAEMON_STOP_TIMEOUT } from '../defs';
import { AgentWaitTimeoutError } from '../errors';
import { lockFilePath, parseAddress, removeSocketFile } from '../util';

/**
 * Manager of daemon processes started with Forever.
 */
export class ForeverDaemon implements Daemon {
  constructor(private readonly _rootDir: string) {}

  async connect(): Promise<void> {
    forever.load({ root: path.join(this._rootDir, 'forever') });
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    const { isLocked } = await import('@dxos/client-services');
    return await isLocked(lockFilePath(profile));
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

    return Promise.all(
      result.map(async ({ uid, foreverPid, ctime, running, restarts, logFile }: ForeverProcess) => {
        return {
          profile: uid,
          pid: foreverPid,
          started: ctime,
          running,
          restarts,
          logFile,
          locked: await this.isRunning(uid), // TODO(burdon): Different from "running"?
        } satisfies ProcessInfo;
      }),
    );
  }

  async start(profile: string, options?: StartOptions): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      // Check if there is stopped process.
      if (!(await this._getProcess(profile)).running) {
        // NOTE: This kills forever watchdog process. We do not try to restart it in case if arguments changed.
        await this.stop(profile);
      }

      const logDir = path.join(this._rootDir, 'profile', profile, 'logs');
      mkdirSync(logDir, { recursive: true });
      log('starting...', { profile, logDir });

      const logFile = path.join(logDir, 'daemon.log');
      const outFile = path.join(logDir, 'out.log');
      const errFile = path.join(logDir, 'err.log');

      // Clear err file.
      if (fs.existsSync(errFile)) {
        fs.unlinkSync(errFile);
      }

      // Run the `dx agent run` CLI command.
      // https://github.com/foreversd/forever-monitor
      // TODO(burdon): Call local run services binary directly (not via CLI)?
      forever.startDaemon(process.argv[1], {
        args: [
          'agent',
          'start',
          '--foreground',
          `--profile=${profile}`,
          options?.metrics ? '--metrics' : '',
          options?.config ? `--config=${options.config}` : '',
        ],
        uid: profile,
        max: 0,
        logFile, // Forever daemon process.
        outFile, // Child stdout.
        errFile, // Child stderr.

        // TODO(burdon): Configure to watch config file.
        //  https://github.com/foreversd/forever-monitor/blob/master/lib/forever-monitor/plugins/watch.js
        // watch: true,
        // watchIgnorePatterns (ignore all profiles except the current one).
        // watchDirectory
      });

      try {
        // Wait for socket file to appear.
        {
          await waitForCondition({
            condition: async () => await this.isRunning(profile),
            timeout: DAEMON_START_TIMEOUT,
            interval: CHECK_INTERVAL,
            error: new AgentWaitTimeoutError(),
          });
          await waitForCondition({
            condition: () => fs.existsSync(parseAddress(getUnixSocket(profile)).path),
            timeout: DAEMON_START_TIMEOUT,
            interval: CHECK_INTERVAL,
            error: new AgentWaitTimeoutError(),
          });
        }

        // Check if agent is initialized.
        {
          const services = fromAgent({ profile });
          await services.open();

          const trigger = new Trigger();
          const stream = services.services.SystemService!.queryStatus({});
          stream.subscribe(({ status }) => {
            assert(status === SystemStatus.ACTIVE);
            trigger.wake();
          });
          await asyncTimeout(trigger.wait(), DAEMON_START_TIMEOUT);

          stream.close();
          await services.close();
        }
        return await this._getProcess(profile);
      } catch (err) {
        log.warn('Failed to start daemon.');
        const errContent = fs.readFileSync(errFile, 'utf-8');
        log.error(errContent);
        await this.stop(profile);
        throw err;
      }
    }

    const proc = await this._getProcess(profile);
    log('started', { profile: proc.profile, pid: proc.pid });
    return proc;
  }

  async stop(profile: string, { force = false }: { force?: boolean } = {}): Promise<ProcessInfo | undefined> {
    const proc = await this._getProcess(profile);

    // NOTE: Kill all processes with the given profile.
    // This is necessary when somehow few processes are started with the same profile.
    (await this.list())
      .filter((process) => process.profile === profile)
      .forEach((process) => {
        if (force && process.running) {
          forever.stop(process.profile!);
        } else {
          forever.kill(proc.pid!, true, 'SIGINT');
        }
      });

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

  async _getProcess(profile?: string): Promise<ProcessInfo> {
    return (await this.list()).find((process) => !profile || process.profile === profile) ?? {};
  }
}
