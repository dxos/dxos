//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { Serializable, fork, ChildProcess } from 'child_process';
import debug from 'debug';
import * as fs from 'fs';

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { RpcPort } from '@dxos/rpc';

import { BotPackageSpecifier } from '../proto/gen/dxos/bot';
import { BotContainer, BotExitStatus, SpawnOptions } from './bot-container';

const log = debug('dxos:botkit:node-container');

export class NodeContainer implements BotContainer {
  private _processes = new Map<string, ChildProcess>();

  readonly error = new Event<[string, Error]>();
  readonly exited = new Event<[string, BotExitStatus]>();

  constructor (
    /**
     * Passed through '-r' to the node runtime to be loaded on stratup.
     */
    private readonly _additionalRequireModules: string[] = []
  ) {}

  async spawn ({ pkg, id, logFilePath }: SpawnOptions): Promise<RpcPort> {
    assert(pkg.localPath, 'Node container only supports "localPath" package specifiers.');
    log(`[${id}] Spawning ${pkg.localPath}`);
    const child = fork(pkg.localPath, [], {
      execArgv: this._additionalRequireModules.flatMap(mod => ['-r', mod]),
      serialization: 'advanced',
      stdio: !!logFilePath ? 'pipe' : 'inherit',
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1'
      }
    });
    const port = createIpcPort(child);
    this._processes.set(id, child);

    child.on('exit', (code, signal) => {
      log(`[${id}] exited with code ${code} and signal ${signal}`);
      this._processes.delete(id);
      this.exited.emit([id, { code, signal }]);
    });

    child.on('error', (error) => {
      log(`[${id}] error: ${error}`);
      this.error.emit([id, error]);
    });

    child.on('disconnect', () => {
      log(`[${id}] IPC stream disconnected`);
      this.error.emit([id, new Error('Bot child process disconnected from IPC stream.')]);
    });

    if(logFilePath) {
      const file = fs.createWriteStream(logFilePath);
      child.stdout!.pipe(file);
      child.stderr!.pipe(file);
    }

    return port;
  }

  async kill (id: string) {
    const child = this._processes.get(id) ?? raise(new Error(`Bot ${id} not found.`));

    child.kill();
    this._processes.delete(id);
  }

  killAll () {
    for (const [id, botProcess] of Array.from(this._processes.entries())) {
      botProcess.kill();
      this._processes.delete(id);
    }
  }
}

export interface IpcProcessLike {
  on(event: 'message', listener: (message: Serializable) => void): void;
  off(event: 'message', listener: (message: Serializable) => void): void;

  send?(message: Serializable, callback?: ((error: Error | null) => void) | undefined): boolean;
}

export function createIpcPort (proc: IpcProcessLike): RpcPort {
  return {
    send: msg => {
      return new Promise<void>((resolve, reject) => {
        if (!proc.send) {
          reject(new Error('Given port is not able to send messages'));
          return;
        }
        proc.send(msg, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
    subscribe: cb => {
      const ipcCallback = (msg: Serializable): void => {
        if (!(msg instanceof Uint8Array)) {
          log(`Invalid message type received from on IPC socket: type=${typeof msg}`);
          return;
        }
        cb(msg);
      };
      proc.on('message', ipcCallback);

      return () => {
        proc.off('message', ipcCallback);
      };
    }
  };
}
