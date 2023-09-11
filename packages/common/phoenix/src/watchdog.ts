//
// Copyright 2023 DXOS.org
//

import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { FileHandle } from 'node:fs/promises';
import { promisify } from 'node:util';
import psTree from 'ps-tree';

import { synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { LockFile } from '@dxos/lock-file';
import { log } from '@dxos/log';

import { waitForLockAcquisition, waitForLockRelease } from './utils';

export type DaemonInfo = {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  timestamp: number;
};

export type ProcessInfo = WatchDogParams & {
  pid?: number;
  timestamp?: number;
  restarts?: number;
  running?: boolean;
};

export type ConfigFiles = {
  lockFile: string; // Path to lock file
  //
  // Log files and associated logging options for this instance
  //
  logFile: string; // Path to log output all logs
  errFile: string; // Path to log output from child stderr
};

export type WatchDogParams = {
  uid: string; // Unique identifier for this instance

  //
  // Basic configuration options
  //
  maxRestarts?: number | undefined; // Sets the maximum number of times a given script should run
  killTree?: boolean | undefined; // Kills the entire child process tree on `exit`

  //
  // Command to spawn as well as options and other vars
  // (env, cwd, etc) to pass along
  //
  command?: string; // Binary to run (default: 'node')
  args?: string[] | undefined; // Additional arguments to pass to the script,

  //
  // More specific options to pass along to `child_process.spawn` which
  // will override anything passed to the `spawnWith` option
  //
  env?: NodeJS.ProcessEnv | undefined;
  cwd?: string | undefined;
  shell?: boolean | undefined;
} & ConfigFiles;

export class WatchDog {
  private _lock?: FileHandle;
  private _child?: ChildProcessWithoutNullStreams;
  private _restarts = 0;
  private _processCtx?: Context;

  constructor(private readonly _params: WatchDogParams) {}

  @synchronized
  async start() {
    await this._acquireLock();
    this._log('Lock acquired.');
    const { cwd, shell, env, command, args } = { cwd: process.cwd(), ...this._params };
    invariant(command, 'Command is not defined.');

    this._log(`Spawning process ${command} ${args?.join(' ')}`);
    this._child = spawn(command, args, { cwd, shell, env, stdio: 'pipe' });
    this._processCtx = new Context();

    this._child.stdout.on('data', (data: Uint8Array) => {
      this._log(String(data));
    });
    this._child.stderr.on('data', (data: Uint8Array) => {
      this._err(data);
    });

    // Setup restart handler.
    {
      const restartHandler = async (code: number, signal: number | NodeJS.Signals) => {
        if (code && code !== 0) {
          this._err(`Died unexpectedly with exit code ${code} (signal: ${signal}).`);
          await this.restart();
        }
      };

      this._child.on('close', restartHandler);

      // We should unsubscribe from the event when the process is killed by us to not try to restart it.
      this._processCtx.onDispose(() => {
        this._child!.off('close', restartHandler);
      });
    }

    this._child.on('close', (code: number, signal: number | NodeJS.Signals) => {
      this._log(`Stopped with exit code ${code} (signal: ${signal}).`);
    });

    invariant(this._child.pid, 'Child process has no pid.');

    const childInfo: ProcessInfo = {
      pid: process.pid,
      timestamp: Date.now(),
      restarts: this._restarts,
      ...this._params,
    };

    writeFileSync(this._params.lockFile, JSON.stringify(childInfo, undefined, 2), { flag: 'w', encoding: 'utf-8' });
    this._log(`Started with pid ${this._child.pid}.`);
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
    if (this._params.maxRestarts !== undefined && this._restarts >= this._params.maxRestarts) {
      this._err('Max restarts number is reached');
    } else {
      log('Restarting...');
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
      throw new Error('Lock file is already locked.');
    }
    this._lock = await LockFile.acquire(this._params.lockFile);
    await waitForLockAcquisition(this._params.lockFile);
  }

  private async _releaseLock() {
    invariant(this._lock, 'Lock is not defined.');

    await LockFile.release(this._lock);
    await waitForLockRelease(this._params.lockFile);

    this._lock = undefined;
  }

  private _log(message: string | Uint8Array) {
    writeFileSync(this._params.logFile, message + '\n', {
      flag: 'a+',
      encoding: 'utf-8',
    });
  }

  private _err(message: string | Uint8Array) {
    this._log(message);
    writeFileSync(this._params.errFile, message + '\n', {
      flag: 'a+',
      encoding: 'utf-8',
    });
  }
}
