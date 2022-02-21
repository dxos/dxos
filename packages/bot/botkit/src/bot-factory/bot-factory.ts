//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { debug } from 'debug';
import { join } from 'path';

import { promiseTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import { keyToString, randomBytes } from '@dxos/crypto';

import { BotContainer } from '../bot-container';
import { BotHandle } from '../bot-factory';
import { Bot, BotFactoryService, GetLogsRequest, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { ContentResolver } from './dxns-content-resolver';
import type { ContentLoader } from './ipfs-content-loader';

const log = debug('dxos:botkit:bot-factory');

export interface BotFactoryOptions {
  botContainer: BotContainer,
  config: Config,
  contentResolver?: ContentResolver,
  contentLoader?: ContentLoader,
}

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _contentLoader: ContentLoader | undefined;
  private readonly _contentResolver: ContentResolver | undefined;
  private readonly _botContainer: BotContainer;
  private readonly _config: Config;

  private readonly _bots = new Map<string, BotHandle>();

  constructor (options: BotFactoryOptions) {
    this._botContainer = options.botContainer;
    this._config = options.config;
    this._contentLoader = options.contentLoader;
    this._contentResolver = options.contentResolver;

    this._botContainer.exited.on(([id, status]) => {
      const bot = this._bots.get(id);
      if (!bot) {
        log(`Bot exited but not found in factory: ${id}`);
        return;
      }

      bot.onProcessExited(status);
    });

    this._botContainer.error.on(async ([id, error]) => {
      const bot = this._bots.get(id);
      if (!bot) {
        log(`Bot errored but not found in factory: ${id}`);
        return;
      }

      bot.onProcessError(error);

      try {
        await this._botContainer.kill(id);
      } catch (err) {
        log(`Failed to kill bot: ${id}`);
      }
    });
  }

  async getBots () {
    log('List bots request');
    return {
      bots: Array.from(this._bots.values()).map(handle => handle.bot)
    };
  }

  async spawnBot (request: SpawnBotRequest) {
    const id = keyToString(randomBytes(6));
    try {
      log(`${id}: Resolving bot package: ${JSON.stringify(request.package)}`);
      const packageSpecifier = request.package;

      if (this._contentResolver && request.package?.dxn) {
        request.package = await this._contentResolver.resolve(request.package.dxn);
      }

      const handle = new BotHandle(
        id,
        join(process.cwd(), 'bots', id),
        this._config,
        packageSpecifier
      );
      log(`[${id}] Bot directory is set to ${handle.workingDirectory}`);
      await handle.initializeDirectories();
      const contentDirectory = handle.getContentPath();

      if (this._contentLoader && request.package?.ipfsCid) {
        request.package.localPath = await this._contentLoader.download(request.package.ipfsCid, contentDirectory);
      }

      const localPath = request.package?.localPath;

      if (localPath) {
        log(`[${id}] Spawning bot ${localPath}`);
        handle.localPath = localPath;
      }

      this._bots.set(id, handle);

      handle.startTimestamp = new Date();

      const port = await this._botContainer.spawn({
        id,
        localPath,
        logFilePath: handle.getLogFilePath(handle.startTimestamp)
      });
      log(`[${id}] Openning RPC channel`);
      await handle.open(port);
      log(`[${id}] Initializing bot`);
      await handle.rpc.initialize({
        config: handle.config.values,
        invitation: request.invitation
      });
      log(`[${id}] Initialization complete`);
      return handle.bot;
    } catch (error: any) {
      log(`[${id}] Failed to spawn bot: ${error.stack ?? error}`);
      throw error;
    }
  }

  async start (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(request.id);

      bot.startTimestamp = new Date();

      const port = await this._botContainer.spawn({
        id,
        localPath: bot.localPath,
        logFilePath: bot.getLogFilePath(bot.startTimestamp)
      });
      log(`[${id}] Openning RPC channel`);
      await bot.open(port);
      log(`[${id}] Initializing bot`);
      await bot.rpc.start({ config: bot.config.values });
      await bot.update.waitForCondition(() => bot.bot.status === Bot.Status.RUNNING);
      log(`[${id}] Initialization complete`);
      return bot.bot;
    } catch (error: any) {
      log(`[${id}] Failed to start bot: ${error.stack ?? error}`);
      throw error;
    }
  }

  async stop (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(id);
      log(`[${id}] Stopping bot`);
      try {
        await promiseTimeout(bot.rpc.stop(), 3000, new Error('Stopping bot timed out'));
      } catch (error: any) {
        log(`[${id}] Failed to stop bot: ${error}`);
      }
      await this._botContainer.kill(id);
      await bot.update.waitForCondition(() => bot.bot.status === Bot.Status.STOPPED);
      log(`[${id}] Bot stopped`);
      return bot.bot;
    } catch (error: any) {
      log(`[${id}] Failed to stop bot: ${error.stack ?? error}`);
      throw error;
    }
  }

  async remove (request: Bot) {
    assert(request.id);
    const bot = this._getBot(request.id);
    if (bot.bot.status === Bot.Status.RUNNING) {
      await this.stop(bot.bot);
    }
    this._bots.delete(request.id);
    await bot.clearFiles();
  }

  async sendCommand (request: SendCommandRequest) {
    assert(request.botId);
    const bot = this._getBot(request.botId);
    const respone = await bot.rpc.command(request);
    return respone;
  }

  async removeAll () {
    await Promise.all(Array.from(this._bots.values()).map(bot => this.remove(bot.bot)));
  }

  getLogs (request: GetLogsRequest) {
    assert(request.botId);
    const bot = this._getBot(request.botId);
    return bot.getLogsStream();
  }

  private _getBot (botId: string) {
    const bot = this._bots.get(botId);
    assert(bot, 'Bot not found');
    return bot;
  }
}
