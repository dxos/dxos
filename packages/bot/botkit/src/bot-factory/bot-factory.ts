//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { debug } from 'debug';
import fs from 'fs';
import { join } from 'path';

import type { defs } from '@dxos/config';
import { createId } from '@dxos/crypto';

import { BotContainer } from '../bot-container';
import { BotHandle } from '../bot-factory';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { ContentResolver } from './dxns-content-resolver';
import { ContentLoader } from './ipfs-content-loader';

const log = debug('dxos:botkit:bot-factory');

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _bots = new Map<string, BotHandle>();
  private readonly _workingDir = './out';
  private _contentLoader: ContentLoader | undefined;
  private _contentResolver: ContentResolver | undefined;

  constructor (
    private readonly _botContainer: BotContainer,
    private readonly _botConfig: defs.Config = {}
  ) {
    _botContainer.exited.on(([id, status]) => {
      const bot = this._bots.get(id);
      if (!bot) {
        log(`Bot exited but not found in factory: ${id}`);
        return;
      }

      bot.onProcessExited(status);
    });

    _botContainer.error.on(async ([id, error]) => {
      const bot = this._bots.get(id);
      if (!bot) {
        log(`Bot errored but not found in factory: ${id}`);
        return;
      }

      bot.onProcessError(error);

      try {
        await _botContainer.kill(id);
      } catch (err) {
        log(`Failed to kill bot: ${id}`);
      }
    });
  }

  setContentLoader (loader: ContentLoader) {
    this._contentLoader = loader;
  }

  serContentResolver (resolver: ContentResolver) {
    this._contentResolver = resolver;
  }

  private async _ensurePackageExists (localPath: string) {
    assert(localPath, `Couldn't resolve bot package ${localPath}.`);
    await fs.promises.access(localPath, fs.constants.F_OK);
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

      if (this._contentLoader && request.package?.ipfsCid) {
        request.package.localPath = await this._contentLoader.download(request.package.ipfsCid, this._workingDir);
      }

      const localPath = request.package?.localPath;

      if (localPath) {
        await this._ensurePackageExists(localPath);
        log(`[${id}] Spawning bot ${localPath}`);
      }

      const handle = new BotHandle(id, join(process.cwd(), 'bots', id));
      log(`[${id}] Bot directory is set to ${handle.workingDirectory}`);
      await handle.initializeDirectories();

      const port = await this._botContainer.spawn({
        id,
        localPath,
        logFilePath: handle.getLogFilePath(new Date())
      });
      log(`[${id}] Openning RPC channel`);
      await handle.open(port);
      log(`[${id}] Initializing bot`);
      await handle.rpc.Initialize({
        config: this._botConfig,
        invitation: request.invitation,
        secret: request.secret
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
    return request;
  }

  async Stop (request: Bot) {
    assert(request.id);
    const bot = this._getBot(request.id);
    await bot.rpc.Stop();
    return bot.bot;
  }

  async Remove (request: Bot) {}

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
