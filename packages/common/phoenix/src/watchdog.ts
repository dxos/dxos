//
// Copyright 2023 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { type FileHandle } from 'node:fs/promises';

import { synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { waitForPidDeletion, waitForPidFileBeingFilledWithInfo } from './utils';

export type ProcessInfo = WatchDogProps & {
  pid?: number;
  started?: number;
  restarts?: number;
  running?: boolean;
};

export type WatchDogProps = {
  profile?: string; // Human readable process identifier
  pidFile: string; // Path to PID file

  //
  // Log files and associated logging options for this instance
  //
  logFile: string; // Path to log output all logs
  errFile: string; // Path to log output from child stderr

  //
  // Basic configuration options
  //
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
};

export class WatchDog {
  private _lock?: FileHandle; // TODO(burdon): Not used?
  private _child?: ChildProcessWithoutNullStreams;
  private _restarts = 0;

  constructor(private readonly _params: WatchDogProps) {}

  @synchronized
  async start(): Promise<void> {
    const { cwd, shell, env, command, args } = { cwd: process.cwd(), ...this._params };

    this._log(`Spawning process \`\`\`${command} ${args?.join(' ')}\`\`\``);
    this._child = spawn(command, args, { cwd, shell, env, stdio: 'pipe' });

    this._child.stdout.on('data', (data: Uint8Array) => {
      this._log(String(data));
    });
    this._child.stderr.on('data', (data: Uint8Array) => {
      this._err(data);
    });
    this._child.on('close', async (code: number, signal: number | NodeJS.Signals) => {
      if (code && code !== 0 && signal !== 'SIGINT' && signal !== 'SIGKILL') {
        this._err(`Died unexpectedly with exit code ${code} (signal: ${signal}).`);
        await this.restart();
      }
      this._log(`Stopped with exit code ${code} (signal: ${signal}).`);
      if (existsSync(this._params.pidFile)) {
        unlinkSync(this._params.pidFile);
      }
    });

    const childInfo: ProcessInfo = {
      pid: this._child.pid,
      started: Date.now(),
      restarts: this._restarts,
      ...this._params,
    };

    writeFileSync(this._params.pidFile, JSON.stringify(childInfo, undefined, 2), { encoding: 'utf-8' });

    await waitForPidFileBeingFilledWithInfo(this._params.pidFile);
  }

  /**
   * Sends SIGKILL to the child process and the tree it spawned (if `killTree` param is `true`).
   */
  @synchronized
  async kill(): Promise<void> {
    if (!this._child) {
      return;
    }

    await this._killWithSignal('SIGKILL');

    if (existsSync(this._params.pidFile)) {
      unlinkSync(this._params.pidFile);
    }

    await waitForPidDeletion(this._params.pidFile);
  }

  async restart(): Promise<void> {
    await this.kill();
    if (this._params.maxRestarts !== undefined && this._restarts >= this._params.maxRestarts) {
      this._err('Max restarts number is reached');
    } else {
      log('Restarting...');
      this._restarts++;
      await this.start();
    }
  }

  async _killWithSignal(signal: number | NodeJS.Signals): Promise<void> {
    invariant(this._child?.pid, 'Child process has no pid.');
    this._child.kill(signal);
    this._child = undefined;
  }

  private _log(message: string | Uint8Array): void {
    writeFileSync(this._params.logFile, message + '\n', {
      flag: 'a+',
      encoding: 'utf-8',
    });
  }

  private _err(message: string | Uint8Array): void {
    this._log(message);
    writeFileSync(this._params.errFile, message + '\n', {
      flag: 'a+',
      encoding: 'utf-8',
    });
  }
}
