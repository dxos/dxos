//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { debug } from 'debug';
import { join } from 'path';

import { Config, ConfigV1Object } from '@dxos/config';
import { createId } from '@dxos/crypto';

import { BotContainer } from '../bot-container';
import { BotHandle } from '../bot-factory';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { ContentResolver } from './dxns-content-resolver';
import { ContentLoader } from './ipfs-content-loader';

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

  async GetBots () {
    return {
      bots: Array.from(this._bots.values()).map(handle => handle.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const id = createId();
    try {
      log(`${id}: Resolving bot package: ${JSON.stringify(request.package)}`);

      if (this._contentResolver && request.package?.dxn) {
        request.package = await this._contentResolver.resolve(request.package.dxn);
      }

      const handle = new BotHandle(
        id,
        join(process.cwd(), 'bots', id),
        this._config
      );
      log(`[${id}] Bot directory is set to ${handle.workingDirectory}`);
      await handle.initializeDirectories();
      const workingDirectory = handle.getContentPath();

      if (this._contentLoader && request.package?.ipfsCid) {
        request.package.localPath = await this._contentLoader.download(request.package.ipfsCid, workingDirectory);
      }

      const localPath = request.package?.localPath;

      if (localPath) {
        log(`[${id}] Spawning bot ${localPath}`);
        handle.localPath = localPath;
      }

      const port = await this._botContainer.spawn({
        id,
        localPath,
        logFilePath: handle.getLogFilePath(new Date())
      });
      log(`[${id}] Openning RPC channel`);
      await handle.open(port);
      log(`[${id}] Initializing bot`);
      await handle.rpc.Initialize({
        config: handle.config.values,
        invitation: request.invitation
      });
      log(`[${id}] Initialization complete`);
      this._bots.set(id, handle);
      return handle.bot;
    } catch (error: any) {
      log(`[${id}] Failed to spawn bot: ${error.stack ?? error}`);
      throw error;
    }
  }

  async Start (request: Bot) {
    assert(request.id);
    const bot = this._getBot(request.id);
    const id = bot.id;
    const port = await this._botContainer.spawn({
      id,
      localPath: bot.localPath,
      logFilePath: bot.getLogFilePath(new Date())
    });
    log(`[${id}] Openning RPC channel`);
    await bot.open(port);
    log(`[${id}] Initializing bot`);
    await bot.rpc.Start({ config: bot.config.values });
    return bot.bot;
  }

  async Stop (request: Bot) {
    assert(request.id);
    const bot = this._getBot(request.id);
    await bot.rpc.Stop();
    return bot.bot;
  }

  async Kill (request: Bot) {
    assert(request.id);
    await this.Stop(request);
    const bot = this._getBot(request.id);
    this._bots.delete(request.id);
    await bot.clearFiles();
  }

  async SendCommand (request: SendCommandRequest) {
    assert(request.botId);
    const bot = this._getBot(request.botId);
    const respone = await bot.rpc.Command(request);
    return respone;
  }

  async Destroy () {
    await Promise.all(Array.from(this._bots.values()).map(bot => bot.rpc.Stop()));
  }

  private _getBot (botId: string) {
    const bot = this._bots.get(botId);
    assert(bot, 'Bot not found');
    return bot;
  }
}
