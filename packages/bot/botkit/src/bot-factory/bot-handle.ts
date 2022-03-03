//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import fs from 'fs';
import { join } from 'path';
import { Tail } from 'tail';

import { Event, promiseTimeout, ReadOnlyEvent } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { BotContainer, BotExitStatus } from '../bot-container';
import { schema } from '../proto/gen';
import { Bot, BotPackageSpecifier, BotService, GetLogsResponse } from '../proto/gen/dxos/bot';
import { InvitationDescriptor } from '../proto/gen/dxos/echo/invitation';

interface BotHandleOptions {
  config?: Config,
  packageSpecifier?: BotPackageSpecifier,
  partyKey?: PublicKey
}

type StartParams = { initialize: false } | { initialize: true, invite?: InvitationDescriptor };

/**
 * Represents a running bot instance in BotFactory.
 */
export class BotHandle {
  private _rpc: ProtoRpcClient<BotService> | null = null;
  private readonly _bot: Bot;
  private readonly _log = debug(`dxos:botkit:bot-handle:${this.id}`);
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
    private readonly _botContainer: BotContainer,
    options: BotHandleOptions = {}
  ) {
    const {
      config = new Config({ version: 1 }),
      packageSpecifier,
      partyKey
    } = options;
    this._bot = {
      id,
      status: Bot.Status.SPAWNING,
      packageSpecifier,
      partyKey
    };
    this._config = new Config(config.values);

    this._botContainer.exited.on(([id, status]) => {
      if (id !== this.id) {
        return;
      }

      this.onProcessExited(status);
    });

    this._botContainer.error.on(async ([id, error]) => {
      if (id !== this.id) {
        return;
      }

      this.onProcessError(error);

      try {
        await this._botContainer.kill(id);
      } catch (err) {
        this._log(`Failed to kill bot: ${id}`);
      }
    });
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

  async spawn (invitation?: InvitationDescriptor): Promise<Bot> {
    const bot = await this._start({ initialize: true, invite: invitation });
    return bot; 
  }

  async start (): Promise<Bot> {
    const bot = await this._start({ initialize: false });
    return bot; 
  }

  async stop (): Promise<Bot> {
      try {
        await promiseTimeout(this.rpc.stop(), 3000, new Error('Stopping bot timed out'));
      } catch (error: any) {
        this._log(`Failed to stop bot: ${error}`);
      }
      await this._botContainer.kill(this.id);
      await this.update.waitForCondition(() => this.bot.status === Bot.Status.STOPPED);
      this._log(`Bot stopped`);
      return this.bot;
  }

  async remove () {
    if (this.bot.status === Bot.Status.RUNNING) {
      await this.stop();
    }
    await this._clearFiles();
  }

  private async _start (params: StartParams): Promise<Bot> {
    this._bot.status = Bot.Status.STARTING;
    const port = await this._botContainer.spawn({
      id: this.id,
      localPath: this.localPath,
      logFilePath: this.getLogFilePath(this.startTimestamp)
    });

    this._log(`Openning RPC channel`);
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotService'),
      {
        port,
        timeout: 60_000 // TODO(dmaretskyi): Turn long-running RPCs into streams and shorten the timeout.
      }
    );
    await this._rpc.open();
    if (params.initialize) {
      this._log(`Initializing bot`);
      await this.rpc.initialize({
        config: this.config.values,
        invitation: params.invite
      });
      this._log(`Initialization complete`);
    }
    this._bot.status = Bot.Status.RUNNING;
    this._bot.lastStart = this.startTimestamp;
    this._bot.runtime = {};
    this.update.emit();
    this._log('Bots stated');
    return this.bot;
  }

  async close () {
    assert(this._rpc, 'BotHandle is not open');
    this._rpc.close();
    this._rpc = null;
    this.update.emit();
  }

  private async _clearFiles () {
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
