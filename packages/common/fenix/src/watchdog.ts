//
// Copyright 2023 DXOS.org
//

import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { FileHandle } from 'node:fs/promises';
import psTree from 'ps-tree';

import { synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { LockFile } from '@dxos/lock-file';

export type DaemonInfo = {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  timestamp: number;
};

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

  constructor(private readonly _params: WatchDogParams) {}

  @synchronized
  async start() {
    if (await LockFile.isLocked(this._params.lockFile)) {
      throw new Error('Lock file is already locked.');
    }

    const { cwd, shell, env, command, args } = { cwd: process.cwd(), shell: true, ...this._params };

    this._lock = await LockFile.acquire(this._params.lockFile);
    this._child = spawn(command, args, { cwd, shell, env });

    this._child.stdout.on('data', (data) => {
      writeFileSync(this._params.logFile, String(data), { flag: 'a+' });
    });

    this._child.stderr.on('data', (data) => {
      writeFileSync(this._params.logFile, String(data), { flag: 'a+' });
    });

    this._child.on('exit', async (code) => {
      if (code && code !== 0) {
        writeFileSync(this._params.logFile, `Died unexpectedly with exit code ${code}`);
        await this.restart();
      } else {
        writeFileSync(this._params.logFile, 'Stopped.');
      }
    });

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

    invariant(this._child.pid, 'Child process has no pid.');
    await kill({ pid: this._child.pid, killTree: this._params.killTree, signal: 'SIGINT' });
    this._child = undefined;

    invariant(this._lock, 'Lock is not defined.');
    await LockFile.release(this._lock);
    this._lock = undefined;
  }

  /**
   * Sends SIGKILL to the child process and the tree it spawned (if `killTree` param is `true`).
   */
  @synchronized
  async kill() {
    if (!this._child) {
      return;
    }

    invariant(this._child.pid, 'Child process has no pid.');
    await kill({ pid: this._child.pid, killTree: this._params.killTree, signal: 'SIGKILL' });
    this._child = undefined;

    invariant(this._lock, 'Lock is not defined.');

    // Lock should automatically be released.
    this._lock = undefined;
  }

  @synchronized
  async restart() {
    await this.kill();
    this._restarts++;
    if (this._params.maxRestarts && this._restarts >= this._params.maxRestarts) {
      writeFileSync(this._params.logFile, 'Max restarts number is reached', { flag: 'a+' });
    } else {
      await this.start();
    }
  }
}

/**
 * Kills a process and its children with the given signal.
 */
const kill = async ({ pid, killTree, signal }: { pid: number; killTree?: boolean; signal?: string }) => {
  signal = signal || 'SIGKILL';

  return new Promise<void>((resolve, reject) => {
    if (killTree && process.platform !== 'win32') {
      psTree(pid, (err: any, children: any[]) => {
        if (err) {
          reject(err);
        }
        [pid, ...children.map((p) => p.PID)].forEach((tpid) => {
          try {
            process.kill(tpid, signal);
          } catch (ex) {}
        });

        resolve();
      });
    } else {
      try {
        process.kill(pid, signal);
      } catch (ex) {}
      resolve();
    }
  });
};
