//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import fs from 'fs';
import { join } from 'path';
import { Tail } from 'tail';

import { Event, promiseTimeout, sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';
import { createRpcClient, ProtoRpcClient } from '@dxos/rpc';

import { BotContainer, BotExitStatus } from '../bot-container';
import { schema } from '../proto/gen';
import { Bot, BotPackageSpecifier, BotService, GetLogsResponse } from '../proto/gen/dxos/bot';
import { InvitationDescriptor } from '../proto/gen/dxos/echo/invitation';

const MAX_ATTEMPTS = 3;
const ATTEMPT_DELAY = 3_000;

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
      desiredState: Bot.Status.RUNNING,
      packageSpecifier,
      partyKey,
      attemptsToAchieveDesiredState: 0
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

    // Keep bot in the desired state.
    this.update.on(async () => {
      await this.onStatusChange();
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
    this.bot.status = Bot.Status.STARTING;
    await this._spawn();
    await this._initialize(invitation);
    this._updateAfterStart();
    return this.bot;
  }

  async start (): Promise<Bot> {
    if (this.bot.status === Bot.Status.STOPPED) {
      this.bot.attemptsToAchieveDesiredState = 0;
      this.bot.desiredState = Bot.Status.RUNNING;
      this.update.emit();
    } else {
      this._log(`Can not start bot in ${this.bot.status} state.`);
    }
    return this.bot;
  }

  async stop (): Promise<Bot> {
    if (this.bot.status === Bot.Status.RUNNING) {
      this.bot.attemptsToAchieveDesiredState = 0;
      this.bot.desiredState = Bot.Status.STOPPED;
      this.update.emit();
    } else {
      this._log(`Can not stop bot in ${this.bot.status} state.`);
    }
    return this.bot;
  }

  async remove () {
    if (this.bot.status === Bot.Status.RUNNING) {
      await this._doStop();
    }
    await this._clearFiles();
  }

  private async _doStart (): Promise<Bot> {
    this.bot.status = Bot.Status.STARTING;
    await this._spawn();
    await this._start();
    this._updateAfterStart();
    return this.bot;
  }

  private async _doStop (): Promise<Bot> {
    try {
      await promiseTimeout(this.rpc.stop(), 3000, new Error('Stopping bot timed out'));
    } catch (error: any) {
      this._log(`Failed to stop bot: ${error}`);
    }
    await this._botContainer.kill(this.id);
    await this.update.waitForCondition(() => this.bot.status === Bot.Status.STOPPED);
    this._log('Bot stopped');
    return this.bot;
  }

  private async _spawn (): Promise<void> {
    const port = await this._botContainer.spawn({
      id: this.id,
      localPath: this.localPath,
      logFilePath: this.getLogFilePath(this.startTimestamp)
    });

    this._log('Openning RPC channel');
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotService'),
      {
        port,
        timeout: 20_000 // TODO(dmaretskyi): Turn long-running RPCs into streams and shorten the timeout.
      }
    );
    await this._rpc.open();
  }

  private async _initialize (invitation?: InvitationDescriptor): Promise<void> {
    this._log('Initializing bot');
    await this.rpc.initialize({
      config: this.config.values,
      invitation
    });
    this._log('Initialization complete');
  }

  private async _start (): Promise<void> {
    this._log('Starting bot');
    await this.rpc.start({
      config: this.config.values
    });
    this._log('Bot started');
  }

  private _updateAfterStart () {
    this._bot.status = Bot.Status.RUNNING;
    this._bot.lastStart = this.startTimestamp;
    this._bot.runtime = {};
    this.update.emit();
    this._log('Bot started');
  }

  private async _clearFiles () {
    await fs.promises.rm(this.workingDirectory, { recursive: true, force: true });
  }

  toString () {
    return `BotHandle: ${this._bot.id}`;
  }

  async onStatusChange (): Promise<void> {
    if (this.bot.status === this.bot.desiredState) {
      this.bot.attemptsToAchieveDesiredState = 0;
      return;
    }

    if (this.bot.attemptsToAchieveDesiredState! < MAX_ATTEMPTS) {
      if (this.bot.status === Bot.Status.RUNNING && this.bot.desiredState === Bot.Status.STOPPED) {
        await this._waitForNextAttemp();
        await this._doStop();
      } else if (this.bot.status === Bot.Status.STOPPED && this.bot.desiredState === Bot.Status.RUNNING) {
        await this._waitForNextAttemp();
        await this._doStart();
      }
    }
  }

  private async _waitForNextAttemp (): Promise<void> {
    const timeout = this.bot.attemptsToAchieveDesiredState!++ * ATTEMPT_DELAY;
    return sleep(timeout);
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
