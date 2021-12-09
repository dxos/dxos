//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { debug } from 'debug';

import type { defs } from '@dxos/config';
import { createId } from '@dxos/crypto';

import { BotContainer } from '../bot-container';
import { BotHandle } from '../bot-factory';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';

const log = debug('dxos:botkit:bot-factory');

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _bots = new Map<string, BotHandle>();

  constructor (private readonly _botContainer: BotContainer, private readonly _botConfig: defs.Config = {}) {
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

  async GetBots () {
    return {
      bots: Array.from(this._bots.values()).map(handle => handle.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const id = createId();
    const port = await this._botContainer.spawn(request.package ?? {}, id);
    const handle = new BotHandle(port, id);
    await handle.open();
    await handle.rpc.Initialize({
      config: this._botConfig,
      invitation: request.invitation,
      secret: request.secret
    });
    this._bots.set(id, handle);
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
    await Promise.all(Array.from(this._bots.values()).map(bot => bot.rpc.Stop()));
  }

  private _getBot (botId: string) {
    const bot = this._bots.get(botId);
    assert(bot, 'Bot not found');
    return bot;
  }
}
