//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import fs from 'fs';
import { join } from 'path';
import { Tail } from 'tail';

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { BotExitStatus } from '../bot-container';
import { schema } from '../proto/gen';
import { Bot, BotPackageSpecifier, BotService, GetLogsResponse } from '../proto/gen/dxos/bot';
import { PublicKey } from '@dxos/crypto';

interface BotHandleOptions {
  config?: Config,
  packageSpecifier?: BotPackageSpecifier,
  partyKey?: PublicKey
}

/**
 * Represents a running bot instance in BotFactory.
 */
export class BotHandle {
  private _rpc: ProtoRpcClient<BotService> | null = null;
  private readonly _bot: Bot;
  private _config: Config;
  private _startTimestamps: Date[] = [];
  localPath: string | undefined;

  readonly update = new Event();

  /**
   * @param workingDirectory Path to the directory where bot code, data and logs are stored.
   */
  constructor (
    readonly id: string,
    readonly workingDirectory: string,
    options: BotHandleOptions = {}
  ) {
    const {
      config = new Config({ version: 1 }),
      packageSpecifier,
      partyKey
    } = options;
    this._bot = {
      id,
      status: Bot.Status.STOPPED,
      packageSpecifier,
      partyKey
    };
    this._config = new Config(config.values);
  }

  get rpc () {
    assert(this._rpc, 'BotHandle is not open');
    return this._rpc.rpc;
  }

  get bot () {
    return this._bot;
  }

  get config () {
    return this._config;
  }

  get logsDir () {
    return join(this.workingDirectory, 'logs');
  }

  get startTimestamp () {
    return this._startTimestamps[this._startTimestamps.length - 1];
  }

  set startTimestamp (startTimestamp: Date) {
    this._startTimestamps.push(startTimestamp);
  }

  /**
   * To express the intent. The final states (stopped or running) should be updated automaitcally.
   */
  setStarting () {
    this.update.emit();
    this._bot.status = Bot.Status.STARTING;
  }

  /**
   * To express the intent. The final states (stopped or running) should be updated automaitcally.
   */
  setStoppping () {
    this.update.emit();
    this._bot.status = Bot.Status.STOPPING;
  }

  async initializeDirectories () {
    await fs.promises.mkdir(join(this.workingDirectory, 'content'), { recursive: true });
    await fs.promises.mkdir(join(this.workingDirectory, 'storage'), { recursive: true });
    await fs.promises.mkdir(this.logsDir);
    this._config = new Config(
      {
        version: 1,
        runtime: {
          client: {
            storage: {
              persistent: true,
              path: this.getStoragePath()
            }
          }
        }
      },
      this._config.values
    );
  }

  async open (port: RpcPort): Promise<void> {
    if (this._rpc) {
      await this.close();
    }

    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotService'),
      {
        port,
        timeout: 60_000 // TODO(dmaretskyi): Turn long-running RPCs into streams and shorten the timeout.
      }
    );
    await this._rpc.open();
    this._bot.status = Bot.Status.RUNNING;
    this._bot.lastStart = this.startTimestamp;
    this._bot.runtime = {};
    this.update.emit();
  }

  async close () {
    assert(this._rpc, 'BotHandle is not open');
    this._rpc.close();
    this._rpc = null;
    this.update.emit();
  }

  async clearFiles () {
    await fs.promises.rm(this.workingDirectory, { recursive: true, force: true });
  }

  toString () {
    return `BotHandle: ${this._bot.id}`;
  }

  /**
   * Called when the process backing the bot exits.
   */
  onProcessExited (status: BotExitStatus) {
    this.bot.status = Bot.Status.STOPPED;
    this.bot.runtime = {
      ...this.bot.runtime,
      exitCode: status.code ?? undefined,
      exitSignal: status.signal ?? undefined
    };
    this.update.emit();
  }

  /**
   * Called when there's an critical error from the bot container backing the bot.
   */
  onProcessError (error: Error) {
    this.bot.status = Bot.Status.STOPPED;

    this.bot.runtime = {
      ...this.bot.runtime,
      error: error.stack
    };
    this.update.emit();
  }

  /**
   * Returns the name of the log file for the specified timestamp.
   */
  getLogFilePath (startTimestamp: Date) {
    return join(this.logsDir, `${startTimestamp.toISOString()}.log`);
  }

  /**
   * Returns the path to a directory where bot content is stored.
   */
  getContentPath (): string {
    return join(this.workingDirectory, 'content');
  }

  /**
   * Returns the path to a directory that is used as a storage for bot.
   */
  getStoragePath (): string {
    return join(this.workingDirectory, 'storage');
  }

  /**
   * Returns a stream with all the logs associted with given bot and then watches for new logs.
   */
  getLogsStream (): Stream<GetLogsResponse> {
    return new Stream<GetLogsResponse>(({ next, close }) => {
      for (const startTimestamps of this._startTimestamps) {
        const logFilePath = this.getLogFilePath(startTimestamps);
        const logs = fs.readFileSync(logFilePath);
        next({ chunk: logs });
      }
      if (this._bot.status === Bot.Status.STOPPED) {
        close();
        return;
      }
      const currentLogFile = this.getLogFilePath(this.startTimestamp);
      const tail = new Tail(currentLogFile);
      tail.on('line', (line) => {
        next({ chunk: Buffer.from(line) });
      });
      tail.on('error', (error) => {
        close(error);
      });
      this.update.on(() => {
        if (this.bot.status === Bot.Status.STOPPED) {
          tail.unwatch();
          close();
        }
      });
      return () => {
        tail.unwatch();
      };
    });
  }
}
