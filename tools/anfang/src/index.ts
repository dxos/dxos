//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { subtle } from 'node:crypto';
import { existsSync } from 'node:fs';
import { stat, mkdir, rm, FileHandle } from 'node:fs/promises';
import { createServer, Socket } from 'node:net';
import { basename, join } from 'node:path';

import { Trigger } from '@dxos/async';
import { LockFile } from '@dxos/lock-file';
import { log } from '@dxos/log';

import { Framer } from './framer';

export type ForkParams = {
  script: string;
};

export const forkDaemon = (params: ForkParams) => {
  const daemon = new Daemon(params);
  return daemon;
};

type Request = {
  id: number;
  function: string;
  args: any[];
};

type Response = {
  id: number;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  time: number;
};

type OutgoingRequest = {
  id: number;
  trigger: Trigger<Response>;
};

const MAX_CONNECT_RETRIES = 10;

export class Daemon {
  private _initialized!: Promise<void>;
  private _key: string = undefined as any;
  private _lockFile: string = undefined as any;
  private _rpcFile: string = undefined as any;
  private _connected = new Trigger();
  private _mode: 'server' | 'client' = undefined as any;
  private _registeredFunctions = new Map<string, (...args: any[]) => Promise<any>>();
  private _nextId = 0;
  private _framer?: Framer = undefined;
  private _outgoingRequests = new Map<number, OutgoingRequest>();
  private _lockFd: FileHandle | undefined = undefined;
  private _connectRetries = 0;
  private _connectTimeout = 10;
  private _socket?: Socket = undefined;
  private _disabled = false;

  private _startTs: number;

  constructor(private readonly _params: ForkParams) {
    this._disabled = !!process.env.ANFANG_DISABLE;
    this._startTs = performance.now();
    if (!this._disabled) {
      this._initialized = this._open();
    }
  }

  get isWorker() {
    if (this._disabled) {
      return false;
    }
    return this._mode === 'server';
  }

  function<T extends any[], R>(fn: (...args: T) => Promise<R>): (...args: T) => Promise<R> {
    if (this._disabled) {
      return fn;
    }

    const functionId = `fun-${this._registeredFunctions.size}`;
    this._registeredFunctions.set(functionId, fn as any);

    return async (...args: T) => {
      await this._initialized;
      if (this._mode === 'server') {
        return fn(...args);
      } else {
        await this._connected.wait();

        const start = performance.now();
        const request: Request = {
          id: this._nextId++,
          function: functionId,
          args,
        };
        // log('sending request', { request: JSON.stringify(request) })
        this._outgoingRequests.set(request.id, {
          id: request.id,
          trigger: new Trigger(),
        });
        const message = Buffer.from(JSON.stringify(request));
        await this._framer!.port.send(message);
        this._socket!.ref();
        const response: Response = await this._outgoingRequests.get(request.id)!.trigger.wait();

        const time = performance.now() - start;
        log.info('request finished', {
          totalTime: time,
          executionTime: response.time,
          overhead: `${(((time - response.time) / response.time) * 100).toFixed(0)}%`,
          requestLength: message.length,
          error: !!response.error,
        });

        if (response.error) {
          const error = new Error(response.error.message);
          error.stack = response.error.stack;
          throw error;
        } else {
          return response.result;
        }
      }
    };
  }

  /**
   * @internal
   */
  async _open() {
    const scriptStat = await stat(this._params.script);
    const hashComponents: string[] = [this._params.script, scriptStat.mtimeMs.toString()];
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(hashComponents.join(':')));
    this._key = basename(this._params.script) + '-' + Buffer.from(digest).toString('hex').slice(0, 8);
    this._lockFile = join('/tmp/anfang', this._key + '.lock');
    this._rpcFile = join('/tmp/anfang', this._key + '.rpc');

    log.info('daemon initializing', {
      script: this._params.script,
      key: this._key,
      lockFile: this._lockFile,
      rpcFile: this._rpcFile,
    });

    try {
      await mkdir('/tmp/anfang');
    } catch {}

    if (process.env.ANFANG_WORKER) {
      try {
        this._lockFd = await LockFile.acquire(this._lockFile);
        await this._runServer();
      } catch (err) {
        log.warn('locking error', { err });
        log.warn('worker exiting');
      }
    } else {
      if (!existsSync(this._rpcFile)) {
        this._startWorker();
      }
      await this._runClient();
    }
  }

  private _startWorker() {
    const child = fork(this._params.script, {
      env: {
        ...process.env,
        ANFANG_WORKER: '1',
      },
    });
    log.info('forked worker process', { pid: child.pid });
  }

  private async _runServer() {
    log.info('running as server');
    this._mode = 'server';
    try {
      await rm(this._rpcFile);
    } catch {}
    const server = createServer((socket) => {
      const framer = new Framer();
      framer.stream.pipe(socket).pipe(framer.stream);
      framer.port.subscribe(async (message) => {
        const request: Request = JSON.parse(message.toString());
        // log('got request', { request })
        void this._execRequest(request).then((response) => {
          // log('sending response', { response })
          void framer.port.send(Buffer.from(JSON.stringify(response)));
        });
      });
      log('got connection');
    });
    server.listen(this._rpcFile);
  }

  private async _runClient() {
    log('running as client');
    this._mode = 'client';
    this._socket = new Socket();
    this._socket.connect(this._rpcFile);
    this._framer = new Framer();
    this._framer.stream.pipe(this._socket).pipe(this._framer.stream);
    this._framer.port.subscribe(async (message) => {
      const response: Response = JSON.parse(message.toString());
      // log('got response', { response })
      const request = this._outgoingRequests.get(response.id);
      if (request) {
        this._outgoingRequests.delete(response.id);
        request.trigger.wake(response);
      }
      if (this._outgoingRequests.size === 0) {
        this._socket!.unref();
      }
    });

    this._socket.on('connect', () => {
      log.info('connected to server', { time: performance.now() - this._startTs });
      this._connected.wake();
    });
    this._socket.on('error', () => {
      if (this._connectRetries++ > MAX_CONNECT_RETRIES) {
        throw new Error('Max retries exceeded');
      }
      if (this._connectRetries === 1) {
        this._startWorker();
      }
      setTimeout(() => {
        void this._runClient();
      }, this._connectTimeout);
      this._connectTimeout *= 2;
    });
    if (this._outgoingRequests.size === 0) {
      this._socket.unref();
    }
  }

  private async _execRequest(request: Request): Promise<Response> {
    try {
      const start = performance.now();
      const fn = this._registeredFunctions.get(request.function);
      if (!fn) {
        throw new Error(`Function not found: ${request.function}`);
      }

      const res = await fn(...request.args);

      return {
        id: request.id,
        result: res,
        time: performance.now() - start,
      };
    } catch (err: any) {
      return {
        id: request.id,
        error: {
          message: err.message,
          stack: err.stack,
        },
        time: performance.now() - this._startTs,
      };
    }
  }
}
