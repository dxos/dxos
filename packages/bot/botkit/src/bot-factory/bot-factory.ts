//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { debug } from 'debug';
import { join } from 'path';

import { Config } from '@dxos/config';
import { keyToString, randomBytes } from '@dxos/crypto';

import { BotContainer } from '../bot-container';
import { Bot, BotFactoryService, GetLogsRequest, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import { BotHandle } from './bot-handle';
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
      log(`[${id}] Resolving bot package: ${JSON.stringify(request.package)}`);
      const packageSpecifier = request.package;

      if (this._contentResolver && request.package?.dxn) {
        request.package = await this._contentResolver.resolve(request.package.dxn);
      }

      const handle = new BotHandle(
        id,
        join(process.cwd(), 'bots', id),
        this._botContainer,
        {
          config: this._config,
          packageSpecifier,
          partyKey: request.partyKey
        }
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
      await handle.spawn(request.invitation);
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
      const bot = this._getBot(id);
      await bot.start();
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
      const bot = this._getBot(request.id);
      await bot.stop();
      return bot.bot;
    } catch (error: any) {
      log(`[${id}] Failed to stop bot: ${error.stack ?? error}`);
      throw error;
    }
  }

  async remove (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(id);
      await bot.remove();
      this._bots.delete(id);
    } catch (error: any) {
      log(`[${id}] Failed to remove bot: ${error.stack ?? error}`);
      throw error;
    }
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
