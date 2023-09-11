//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { Trigger, asyncTimeout } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { LockFile } from '@dxos/lock-file';
import { log } from '@dxos/log';

import { DAEMON_START_TIMEOUT } from './defs';
import { waitForLockAcquisition, waitForLockFileBeingFilledWithInfo, waitForLockRelease } from './utils';
import { ChildParams, Logs, Lock, ProcessInfo, WatchDogParams } from './watchdog';

const LOCK_FILE_NAME = 'lockfile';

/**
 * Params to start a daemon.
 * User have no control over the lock file.
 */
export type StartParams = ChildParams & Partial<Logs>;

export class DaemonManager {
  constructor(private readonly _rootPath: string) {
    if (!existsSync(join(_rootPath, 'profile'))) {
      mkdirSync(join(_rootPath, 'profile'), { recursive: true });
    }
  }

  private _getConfigFiles(uid: string): Logs & Lock {
    const defaultConfigDir = join(this._rootPath, 'profile', uid);
    if (!existsSync(defaultConfigDir)) {
      mkdirSync(defaultConfigDir, { recursive: true });
    }
    return {
      lockFile: join(defaultConfigDir, LOCK_FILE_NAME),
      logFile: join(defaultConfigDir, 'file.log'),
      errFile: join(defaultConfigDir, 'err.log'),
    };
  }

  async start(params: StartParams) {
    invariant(params.command, 'command is required');
    const watchdogId = PublicKey.random().toHex();
    const watchDogParams: WatchDogParams & { watchdogId: string } = {
      watchdogId,
      ...this._getConfigFiles(params.uid),
      ...params,
    };

    {
      // Create log folders.
      mkdirSync(dirname(watchDogParams.logFile), { recursive: true });
      mkdirSync(dirname(watchDogParams.errFile), { recursive: true });
    }

    {
      // Clear stale lock file if process is not running.
      if (await LockFile.isLocked(watchDogParams.lockFile)) {
        throw new Error('Lock file is already locked.');
      }
      unlinkSync(watchDogParams.lockFile);
    }

    const watchdogPath = join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin', 'watchdog');

    const watchDog = fork(watchdogPath, [JSON.stringify(watchDogParams)], {
      stdio: 'pipe',
      detached: true,
      cwd: __dirname,
    });

    watchDog.on('exit', (code, signal) => {
      if (code && code !== 0) {
        log.error('Monitor died unexpectedly', { code, signal });
      }
    });

    const started = new Trigger();
    watchDog.stdout!.on('data', (data) => {
      if (String(data).includes(watchdogId)) {
        started.wake();
      }
    });

    await asyncTimeout(started.wait(), DAEMON_START_TIMEOUT);
    await waitForLockAcquisition(watchDogParams.lockFile);
    await waitForLockFileBeingFilledWithInfo(watchDogParams.lockFile);

    watchDog.disconnect();
    watchDog.unref();

    return this.getInfo(params.uid);
  }

  async stop(uid: string, force?: boolean) {
    const lockFile = this._getConfigFiles(uid).lockFile;
    const processInfo = JSON.parse(readFileSync(lockFile, { encoding: 'utf-8' }));
    try {
      if (force) {
        process.kill(processInfo.pid, 'SIGKILL');
      } else {
        process.kill(processInfo.pid, 'SIGINT');
      }
    } catch (err) {
      invariant(err instanceof Error, 'Invalid error type.');
      if (!err.name.includes('ESRCH') && !err.message.includes('ESRCH')) {
        throw err;
      }
    }
    await waitForLockRelease(lockFile);

    return this.getInfo(uid);
  }

  async list(): Promise<ProcessInfo[]> {
    const uids = await readdir(join(this._rootPath, 'profile'));
    return Promise.all(
      uids.map(async (uid) => {
        return this.getInfo(uid);
      }),
    );
  }

  async getInfo(uid: string): Promise<ProcessInfo> {
    const files = this._getConfigFiles(uid);

    let info: ProcessInfo = { running: await LockFile.isLocked(files.lockFile), uid, ...files };
    if (existsSync(files.lockFile)) {
      try {
        info = {
          ...info,
          ...JSON.parse(readFileSync(files.lockFile, { encoding: 'utf-8' })),
        };
      } catch (err) {}
    }

    return info;
  }

  async isRunning(uid: string): Promise<boolean> {
    const lockFile = this._getConfigFiles(uid).lockFile;
    return LockFile.isLocked(lockFile);
  }
}
