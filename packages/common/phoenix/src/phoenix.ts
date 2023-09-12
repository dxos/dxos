//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { log } from '@dxos/log';

import { waitForPidDeletion, waitForPidFileBeingFilledWithInfo } from './utils';
import { ProcessInfo, WatchDogParams } from './watchdog';

/**
 * Utils to start/stop detached process with errors and logs handling.
 */
export class Phoenix {
  /**
   * Starts detached watchdog process which starts and monitors selected command.
   */
  static async start(params: WatchDogParams) {
    {
      // Create log folders.
      [params.logFile, params.errFile, params.pidFile].forEach((filename) =>
        mkdirSync(dirname(filename), { recursive: true }),
      );
    }

    {
      // Clear stale pid file.
      if (existsSync(params.pidFile)) {
        await Phoenix.stop(params.pidFile);
      }
      await waitForPidDeletion(params.pidFile);
    }

    const watchdogPath = join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin', 'watchdog');

    const watchDog = fork(watchdogPath, [JSON.stringify(params)], {
      detached: true,
      cwd: __dirname,
    });

    watchDog.on('exit', (code, signal) => {
      if (code && code !== 0) {
        log.error('Monitor died unexpectedly', { code, signal });
      }
    });

    await waitForPidFileBeingFilledWithInfo(params.pidFile);

    watchDog.disconnect();
    watchDog.unref();

    return Phoenix.info(params.pidFile);
  }

  /**
   * Stops detached watchdog process by PID info written down in PID file.
   */
  static async stop(pidFile: string, force = false) {
    if (!existsSync(pidFile)) {
      throw new Error('PID file does not exist');
    }
    const fileContent = readFileSync(pidFile, { encoding: 'utf-8' });
    if (!fileContent.includes('pid')) {
      throw new Error('Invalid PID file content');
    }

    const { pid } = JSON.parse(fileContent);
    const signal: NodeJS.Signals = force ? 'SIGKILL' : 'SIGINT';
    process.kill(pid, signal);
  }

  static info(pidFile: string): ProcessInfo {
    return JSON.parse(readFileSync(pidFile, { encoding: 'utf-8' }));
  }
}
