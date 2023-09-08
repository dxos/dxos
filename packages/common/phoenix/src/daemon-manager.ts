//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { Trigger, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DAEMON_START_TIMEOUT } from './defs';
import { waitForLockAcquisition, waitForLockRelease } from './utils';
import { ConfigFiles, ProcessInfo, WatchDogParams } from './watchdog';

const WATCHDOG_PATH = join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin', 'watchdog');

/**
 * Params to start a daemon.
 * User have no control over the lock file.
 */
export type StartParams = Omit<WatchDogParams, 'lockFile'>;

export class DaemonManager {
  constructor(private readonly _rootPath: string) {
    mkdirSync(join(_rootPath, 'profile'), { recursive: true });
  }

  private _getConfigFiles(uid: string): ConfigFiles {
    const defaultConfigDir = join(this._rootPath, 'profile', uid);
    mkdirSync(defaultConfigDir, { recursive: true });
    return {
      lockFile: join(defaultConfigDir, 'file.lock'),
      logFile: join(defaultConfigDir, 'file.log'),
      errFile: join(defaultConfigDir, 'err.log'),
    };
  }

  async start(params: StartParams) {
    const watchdogId = PublicKey.random().toHex();
    const watchDogParams: WatchDogParams & { watchdogId: string } = {
      watchdogId,
      ...this._getConfigFiles(params.uid),
      ...params,
    };

    const watchDog = fork(WATCHDOG_PATH, [JSON.stringify(watchDogParams)], {
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

    watchDog.disconnect();
    watchDog.unref();
  }

  async stop(uid: string, force?: boolean) {
    const lockFile = this._getConfigFiles(uid).lockFile;
    const processInfo = JSON.parse(readFileSync(lockFile, { encoding: 'utf-8' }));
    if (force) {
      process.kill(processInfo.pid, 'SIGKILL');
    } else {
      process.kill(processInfo.pid, 'SIGINT');
    }
    await waitForLockRelease(lockFile);
  }

  async list(): Promise<ProcessInfo[]> {}
}
