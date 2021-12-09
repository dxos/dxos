//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import type { defs } from '@dxos/config';

import { BotContainer } from '../bot-container';
import { BotHandle } from '../bot-handle';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';

const log = debug('dxos:bot:bot-factory');

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _bots: BotHandle[] = [];

  constructor (private readonly _botContainer: BotContainer, private readonly _botConfig: defs.Config = {}) {}

  async GetBots () {
    return {
      bots: this._bots.map(handle => handle.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    log('Spawning bot');
    const handle = await this._botContainer.spawn(request.package ?? {});
    log('Opening bot handle');
    await handle.open();
    log('Initializing bot');
    await handle.rpc.Initialize({
      config: this._botConfig,
      invitation: request.invitation,
      secret: request.secret
    });
    log('Initialized bot');
    this._bots.push(handle);
    log('Bot spawned');
    return handle.bot;
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
    await Promise.all(this._bots.map(bot => bot.rpc.Stop()));
  }

  private _getBot (botId: string) {
    const bot = this._bots.find(bot => bot.bot.id === botId);
    assert(bot, 'Bot not found');
    return bot;
  }
}
