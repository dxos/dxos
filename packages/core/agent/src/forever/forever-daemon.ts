//
// Copyright 2023 DXOS.org
//

import forever, { ForeverProcess } from 'forever';
import GrowingFile from 'growing-file';
import assert from 'node:assert';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { SystemStatus, fromAgent, getUnixSocket } from '@dxos/client';
import { log } from '@dxos/log';

import { Daemon, ProcessInfo } from '../daemon';
import { DAEMON_START_TIMEOUT } from '../defs';
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
    const { isLocked } = await import('@dxos/client-services');
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

    return result.map(({ uid, foreverPid, running, ctime }: ForeverProcess) => {
      return {
        profile: uid,
        pid: foreverPid,
        running,
        started: ctime,
      };
    });
  }

  async start(profile: string): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
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
        args: ['agent', 'start', '--foreground', `--profile=${profile}`],
        uid: profile,
        max: 1,
        logFile, // Forever daemon process.
        outFile, // Child stdout.
        errFile, // Child stderr.
      });

      const stream = await watchFile(
        errFile,
        (data) => {
          log.warn(data);
        },
        // TODO(burdon): Hack to filter known warnings.
        ["Warning: Accessing non-existent property 'padLevels' of module exports inside circular dependency"],
      );

      // Wait for socket file to appear.
      {
        const { path: socketFile } = parseAddress(getUnixSocket(profile));
        await waitForCondition(() => fs.existsSync(socketFile), DAEMON_START_TIMEOUT);
      }

      // Check if agent is running.
      {
        const services = fromAgent({ profile });
        await services.open();

        const trigger = new Trigger();
        const stream = services.services.SystemService!.queryStatus();
        stream.subscribe(({ status }) => {
          assert(status === SystemStatus.ACTIVE);
          trigger.wake();
        });
        await asyncTimeout(trigger.wait(), DAEMON_START_TIMEOUT);

        stream.close();
        await services.close();
      }

      stream.destroy();
    }

    const proc = await this._getProcess(profile);
    log('started', { profile: proc.profile, pid: proc.pid });
    return proc;
  }

  async stop(profile: string, { force = true }: { force?: boolean } = {}): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      return {};
    }

    const proc = await this._getProcess(profile);

    if (force) {
      // NOTE: Kill all processes with the given profile. This is necessary when somehow few processes are started with the same profile.
      (await this.list()).forEach((process) => {
        if (process.profile === profile) {
          forever.stop(process.profile!);
        }
      });
    } else {
      forever.kill(proc.pid!, true, 'SIGINT');
    }

    await waitFor({
      condition: async () => !(await this.isRunning(profile)),
    });

    removeSocketFile(profile);
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

const watchFile = async (filename: string, cb: (message: string) => void, ignore: string[]) => {
  await waitFor({ condition: async () => fs.existsSync(filename) });
  const stream = GrowingFile.open(filename);
  stream.on('data', (data: Buffer) => {
    const message = data.toString();
    if (!ignore.some((pattern) => message.includes(pattern))) {
      cb(message);
    }
  });

  return stream;
};
