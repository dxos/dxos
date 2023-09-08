//
// Copyright 2023 DXOS.org
//

import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { FileHandle } from 'node:fs/promises';
import { promisify } from 'node:util';
import psTree from 'ps-tree';

import { synchronized, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { LockFile } from '@dxos/lock-file';
import { log } from '@dxos/log';

export type DaemonInfo = {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  timestamp: number;
};

const LOCK_TIMEOUT = 500;
const LOCK_CHECK_INTERVAL = 50;

export type WatchDogParams = {
  //
  // Basic configuration options
  //
  uid?: string | undefined; // Custom uid for this daemon process.
  maxRestarts?: number | undefined; // Sets the maximum number of times a given script should run
  killTree?: boolean | undefined; // Kills the entire child process tree on `exit`

  //
  // Command to spawn as well as options and other vars
  // (env, cwd, etc) to pass along
  //
  command: string; // Binary to run (default: 'node')
  args?: string[] | undefined; // Additional arguments to pass to the script,

  //
  // More specific options to pass along to `child_process.spawn` which
  // will override anything passed to the `spawnWith` option
  //
  env?: NodeJS.ProcessEnv | undefined;
  cwd?: string | undefined;
  shell?: boolean | undefined;

  //
  // Log files and associated logging options for this instance
  //
  logFile: string; // Path to log output all logs
  errFile: string; // Path to log output from child stderr
  lockFile: string; // Path to lock file
};

export class WatchDog {
  private _lock?: FileHandle;
  private _child?: ChildProcessWithoutNullStreams;
  private _restarts = 0;
  private _processCtx?: Context;

  constructor(private readonly _params: WatchDogParams) {}

  @synchronized
  async start() {
    await this._acquireLock();

    const { cwd, shell, env, command, args } = { cwd: process.cwd(), shell: true, ...this._params };

    this._child = spawn(command, args, { cwd, shell, env });
    this._processCtx = new Context();

    // Setup stdout handler.
    {
      const stdoutHandler = (data: Uint8Array) => {
        log.info('stdout:' + String(data));
        writeFileSync(this._params.logFile, String(data), { flag: 'a+' });
      };

      this._child.stdout.on('data', stdoutHandler);

      this._processCtx.onDispose(() => {
        this._child!.stdout.off('data', stdoutHandler);
      });
    }

    // Setup stderr handler.
    {
      const stderrHandler = (data: Uint8Array) => {
        log.error('stderr:' + String(data));
        writeFileSync(this._params.errFile, String(data), { flag: 'a+' });
      };

      this._child.stderr.on('data', stderrHandler);

      this._processCtx.onDispose(() => {
        this._child!.stderr.off('data', stderrHandler);
      });
    }

    // Setup restart handler.
    {
      const restartHandler = async (code: number, signal: number | NodeJS.Signals) => {
        if (code && code !== 0) {
          console.log('Died unexpectedly with exit code %d (signal: %s).', code, signal);
          writeFileSync(this._params.errFile, `Died unexpectedly with exit code ${code} (signal: ${signal}).`);
          await this.restart();
        }
      };

      this._child.on('close', restartHandler);

      // We should unsubscribe from the event when the process is killed by us to not try to restart it.
      this._processCtx.onDispose(() => {
        this._child!.off('close', restartHandler);
      });
    }

    // Setup exit handler.
    {
      const exitHandler = async (code: number, signal: number | NodeJS.Signals) => {
        writeFileSync(this._params.logFile, `Stopped with exit code ${code} (signal: ${signal}).`);
      };

      this._child.on('close', exitHandler);

      this._processCtx.onDispose(() => {
        this._child!.off('close', exitHandler);
      });
    }

    invariant(this._child.pid, 'Child process has no pid.');

    const childInfo = {
      pid: this._child.pid,
      cwd,
      shell,
      timestamp: Date.now(),
      restarts: this._restarts,
      ...this._params,
    };

    writeFileSync(this._params.lockFile, JSON.stringify(childInfo), { flag: 'w' });
  }

  /**
   * Sends SIGINT to the child process and the tree it spawned (if `killTree` param is `true`).
   */
  @synchronized
  async stop() {
    if (!this._child) {
      return;
    }

    await this._killWithSignal('SIGKILL');

    await this._releaseLock();
  }

  /**
   * Sends SIGKILL to the child process and the tree it spawned (if `killTree` param is `true`).
   */
  @synchronized
  async kill() {
    if (!this._child) {
      return;
    }

    await this._killWithSignal('SIGKILL');

    await this._releaseLock();
  }

  async restart() {
    await this.kill();
    if (this._params.maxRestarts && this._restarts >= this._params.maxRestarts) {
      writeFileSync(this._params.logFile, 'Max restarts number is reached', { flag: 'a+' });
    } else {
      log.info('Restarting...');
      this._restarts++;
      await this.start();
    }
  }

  async _killWithSignal(signal: number | NodeJS.Signals) {
    invariant(this._processCtx, 'Process context is not defined.');
    await this._processCtx.dispose();

    // Kill child process tree.
    if (this._params.killTree) {
      if (process.platform !== 'win32') {
        invariant(this._child?.pid, 'Child process has no pid.');
        const children = await promisify(psTree)(this._child.pid);
        children
          .map((p) => p.PID)
          .forEach((tpid) => {
            invariant(tpid, 'Process id is not defined.');
            process.kill(Number(tpid), signal);
          });
      }
    }

    invariant(this._child?.pid, 'Child process has no pid.');
    this._child.kill(signal);
    this._child = undefined;
  }

  private async _acquireLock() {
    if (await LockFile.isLocked(this._params.lockFile)) {
      log.info('Lock file is already acquired.');
      throw new Error('Lock file is already locked.');
    }
    this._lock = await LockFile.acquire(this._params.lockFile);
    await waitForCondition({
      condition: async () => await LockFile.isLocked(this._params.lockFile),
      timeout: LOCK_TIMEOUT,
      interval: LOCK_CHECK_INTERVAL,
      error: new Error('Lock file is not being acquired.'),
    });
  }

  private async _releaseLock() {
    invariant(this._lock, 'Lock is not defined.');

    await LockFile.release(this._lock);
    await waitForCondition({
      condition: async () => !(await LockFile.isLocked(this._params.lockFile)),
      timeout: LOCK_TIMEOUT,
      interval: LOCK_CHECK_INTERVAL,
      error: new Error('Lock file is not being released.'),
    });
    this._lock = undefined;
  }
}
