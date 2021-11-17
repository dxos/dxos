//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { Serializable, fork, ChildProcess } from 'child_process';
import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { BotHandle } from '../bot-handle';
import { BotPackageSpecifier } from '../proto/gen/dxos/bot';
import { BotContainer } from './bot-container';

const log = debug('dxos:botkit:node-container');

export class NodeContainer implements BotContainer {
  private _processes: ChildProcess[] = [];

  constructor (
    /**
     * Passed through '-r' to the node runtime to be loaded on stratup.
     */
    private readonly _additionalRequireModules: string[] = []
  ) {}

  async spawn (pkg: BotPackageSpecifier): Promise<BotHandle> {
    assert(pkg.localPath, 'Node container only supports "localPath" package specifiers.');
    const child = fork(pkg.localPath, [], {
      execArgv: this._additionalRequireModules.flatMap(mod => ['-r', mod]),
      serialization: 'advanced',
      stdio: 'inherit' // TODO: Pipe to file.
    });
    const port = createIpcPort(child);
    this._processes.push(child);
    return new BotHandle(port);
  }

  killAll () {
    for (const botProcess of this._processes) {
      botProcess.kill();
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
        const sent = proc.send(msg, (err) => {
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
