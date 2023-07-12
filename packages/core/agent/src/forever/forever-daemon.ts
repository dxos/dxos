//
// Copyright 2023 DXOS.org
//
import forever, { ForeverProcess } from 'forever';
import GrowingFile from 'growing-file';
import assert from 'node:assert';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';

import { Trigger, waitForCondition } from '@dxos/async';
import { SystemStatus, fromAgent, getUnixSocket } from '@dxos/client';
import { isLocked } from '@dxos/client-services';
import { log } from '@dxos/log';

import { Daemon, ProcessInfo } from '../daemon';
import { DAEMON_START_TIMEOUT } from '../timeouts';
import { lockFilePath, parseAddress, removeSocketFile, waitFor } from '../util';
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
    return (
      isLocked(lockFilePath(profile)) ||
      (await this.list()).some((process) => process.profile === profile && process.running)
    );
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
      const logDir = path.join(this._rootDir, 'profile', profile, 'logs');
      mkdirSync(logDir, { recursive: true });
      log('starting...', { profile, logDir });

      const daemonLogFile = path.join(logDir, 'daemon.log');
      const outFile = path.join(logDir, 'out.log');
      const errFile = path.join(logDir, 'err.log');

      // Clear err file.
      fs.unlinkSync(errFile);

      // Run the `dx agent run` CLI command.
      // TODO(burdon): Call local run services binary directly (not via CLI)?
      forever.startDaemon(process.argv[1], {
        args: ['agent', 'start', '--foreground', `--profile=${profile}`, '--socket'],
        uid: profile,
        logFile: daemonLogFile, // Forever daemon process.
        outFile, // Child stdout.
        errFile, // Child stderr.
      });
      const stream = await printFile(errFile);

      // Wait for socket file to appear.
      {
        const { path: socketFile } = parseAddress(getUnixSocket(profile));
        await waitForCondition(() => fs.existsSync(socketFile), DAEMON_START_TIMEOUT);
      }

      // Check if agent is running.
      {
        const services = fromAgent({ profile });
        await services.open();

        const stream = services.services.SystemService!.queryStatus();
        const trigger = new Trigger();

        stream.subscribe(({ status }) => {
          assert(status === SystemStatus.ACTIVE);
          trigger.wake();
        });
        await trigger.wait();
        stream.close();
        await services.close();
      }
      stream.destroy();
    }

    const proc = await this._getProcess(profile);
    log.info('started', { profile: proc.profile, pid: proc.pid });

    return proc;
  }

  async stop(profile: string): Promise<ProcessInfo> {
    if (await this.isRunning(profile)) {
      forever.kill((await this._getProcess(profile)).pid!, true, 'SIGINT');
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

const printFile = async (filename: string) => {
  await waitFor({ condition: async () => fs.existsSync(filename) });
  const stream = GrowingFile.open(filename);
  stream.on('data', (data: Buffer) => {
    log.info(data.toString());
  });

  return stream;
};
