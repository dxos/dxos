//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import fs from 'fs/promises';
import { join } from 'path';

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { BotExitStatus } from '../bot-container';
import { schema } from '../proto/gen';
import { Bot, BotService } from '../proto/gen/dxos/bot';
import { ConfigV1Object, Config } from '@dxos/config';

/**
 * Represents a running bot instance in BotFactory.
 */
export class BotHandle {
  private _rpc: ProtoRpcClient<BotService> | null = null;
  private readonly _bot: Bot;
  private _config: Config<ConfigV1Object>;
  localPath: string | undefined;

  /**
   * @param workingDirectory Path to the directory where bot code, data and logs are stored.
   */
  constructor (
    readonly id: string,
    readonly workingDirectory: string,
    config: Config<ConfigV1Object> = new Config({})
  ) {
    this._bot = {
      id,
      status: Bot.Status.STOPPED
    };
    this._config = config;
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

  async initializeDirectories () {
    await fs.mkdir(join(this.workingDirectory, 'content'), { recursive: true });
    await fs.mkdir(join(this.workingDirectory, 'storage'), { recursive: true });
    await fs.mkdir(this.logsDir);
  }

  makePersistent () {
    this._config = new Config(this._config.values, 
    {
      runtime: {
        client: {
          storage: {
            persistent: true,
            path: this.getStoragePath()
          }
        }
      }
    });
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
  }

  async close () {
    assert(this._rpc, 'BotHandle is not open');
    this._rpc.close();
    this._rpc = null;
  }

  async clearFiles () {
    await fs.rm(this.workingDirectory, { recursive: true, force: true });
  }

  toString () {
    return `BotHandle: ${this._bot.id}`;
  }

  /**
   * Called when the process backing the bot exits.
   */
  onProcessExited (status: BotExitStatus) {
    this.bot.status = Bot.Status.STOPPED;
    this.bot.exitCode = status.code ?? undefined;
    this.bot.exitSignal = status.signal ?? undefined;
  }

  /**
   * Called when there's an critical error from the bot container backing the bot.
   */
  onProcessError (error: Error) {
    this.bot.status = Bot.Status.STOPPED;
    this.bot.error = error.stack;
  }

  get logsDir () {
    return join(this.workingDirectory, 'logs');
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
}
