//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { Trigger, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DAEMON_START_TIMEOUT } from './defs';
import { waitForLockAcquisition, waitForLockRelease } from './utils';
import { WatchDogParams } from './watchdog';

const WATCHDOG_PATH = join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin', 'watchdog');

export class DaemonManager {
  async start(params: WatchDogParams) {
    const watchdogId = PublicKey.random().toHex();
    const watchDog = fork(WATCHDOG_PATH, [JSON.stringify({ watchdogId, ...params })], {
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
    await waitForLockAcquisition(params.lockFile);

    watchDog.disconnect();
    watchDog.unref();
  }

  async stop(lockFile: string, force?: boolean) {
    const processInfo = JSON.parse(readFileSync(lockFile, { encoding: 'utf-8' }));
    if (force) {
      process.kill(processInfo.pid, 'SIGKILL');
    } else {
      process.kill(processInfo.pid, 'SIGINT');
    }
    await waitForLockRelease(lockFile);
  }
}
