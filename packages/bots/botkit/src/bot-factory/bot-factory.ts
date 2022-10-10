//
// Copyright 2021 DXOS.org
//

import { debug } from 'debug';
import assert from 'node:assert';
import { join } from 'path';

import { Config } from '@dxos/config';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Bot, BotFactoryService, GetLogsRequest, SendCommandRequest, SpawnBotRequest } from '@dxos/protocols/proto/dxos/bot';

import { BotContainer } from '../bot-container/index.js';
import { BOT_OUT_DIR, BOT_FACTORY_DEFAULT_PERSISTENT } from '../config.js';
import { BotHandle } from './bot-handle.js';
import type { ContentResolver } from './dxns-content-resolver.js';
import type { BotSnapshotStorage } from './fs-bot-snapshot-storage.js';
import type { ContentLoader } from './ipfs-content-loader.js';

const log = debug('dxos:botkit:bot-factory');

export interface BotFactoryOptions {
  botContainer: BotContainer
  config: Config
  contentResolver?: ContentResolver
  contentLoader?: ContentLoader
  botSnapshotStorage?: BotSnapshotStorage
}

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _contentLoader: ContentLoader | undefined;
  private readonly _contentResolver: ContentResolver | undefined;
  private readonly _botSnapshotStorage: BotSnapshotStorage | undefined;
  private readonly _botContainer: BotContainer;
  private readonly _config: Config;
  private readonly _persistent: Boolean | undefined;

  private readonly _bots = new Map<string, BotHandle>();

  constructor (options: BotFactoryOptions) {
    this._botContainer = options.botContainer;
    this._config = options.config;
    this._contentLoader = options.contentLoader;
    this._contentResolver = options.contentResolver;
    this._botSnapshotStorage = options.botSnapshotStorage;

    this._persistent = this._config.get('runtime.services.bot.persistent', BOT_FACTORY_DEFAULT_PERSISTENT);

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

  async init () {
    if (this._persistent) {
      const botsToRestore = await this._botSnapshotStorage?.listBackupedBot();
      await Promise.all(botsToRestore!.map(async botId => {
        const restoreInfo = await this._botSnapshotStorage?.restoreBot(botId);
        if (restoreInfo) {
          const { bot, localPath } = restoreInfo;
          log(`Restoring bot: ${botId}`);
          const handle = new BotHandle(botId, join(BOT_OUT_DIR, botId), this._botContainer, {
            config: this._config,
            packageSpecifier: bot.packageSpecifier,
            // TODO(egorgripasov): Restore properly from snapshot storage.
            partyKey: bot.partyKey && PublicKey.from(bot.partyKey.toString())
          });
          handle.startTimestamp = new Date();
          handle.localPath = localPath;
          await handle.initializeDirectories();
          this._bots.set(botId, handle);
          await handle.forceStart();
        }
      }));
    } else {
      await this._botSnapshotStorage?.reset();
    }
  }

  async getBots () {
    log('List bots request');
    return {
      bots: Array.from(this._bots.values()).map(handle => handle.bot)
    };
  }

  async spawnBot (request: SpawnBotRequest) {
    const id = PublicKey.stringify(randomBytes(6));
    try {
      log(`[${id}] Resolving bot package: ${JSON.stringify(request.package)}`);
      const packageSpecifier = request.package;

      const name = packageSpecifier?.name;
      if (this._contentResolver && name) {
        request.package = await this._contentResolver.resolve({ name });
      }

      const handle = new BotHandle(
        id,
        join(BOT_OUT_DIR, id),
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
      await this._botSnapshotStorage?.backupBot(handle.bot, handle.localPath);
      return handle.bot;
    } catch (err: any) {
      log(`[${id}] Failed to spawn bot: ${err.stack ?? err}`);
      throw err;
    }
  }

  async start (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(id);
      await bot.start();
      await this._botSnapshotStorage?.backupBot(bot.bot, bot.localPath);
      return bot.bot;
    } catch (err: any) {
      log(`[${id}] Failed to start bot: ${err.stack ?? err}`);
      throw err;
    }
  }

  async stop (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(request.id);
      await bot.stop();
      await this._botSnapshotStorage?.backupBot(bot.bot, bot.localPath);
      return bot.bot;
    } catch (err: any) {
      log(`[${id}] Failed to stop bot: ${err.stack ?? err}`);
      throw err;
    }
  }

  async remove (request: Bot) {
    assert(request.id);
    const id = request.id;
    try {
      const bot = this._getBot(id);
      await bot.remove();
      await this._botSnapshotStorage?.deleteBackupedBot(id);
      this._bots.delete(id);
    } catch (err: any) {
      log(`[${id}] Failed to remove bot: ${err.stack ?? err}`);
      throw err;
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
