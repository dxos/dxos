//
// Copyright 2023 DXOS.org
//

import { Config } from '@dxos/client';
import { Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { Bot } from './bot';

export type BotConstructor = () => Bot;

/**
 * Mock bot manager.
 * @deprecated Replaced by functions.
 */
export class BotManager {
  constructor(private readonly _botMap: Map<string, BotConstructor>) {}

  async create(config: Config, botId: string, space: Space): Promise<Bot> {
    const constructor = this._botMap.get(botId);
    invariant(constructor);

    const bot = constructor();
    await bot.init(config, space);
    return bot;
  }
}
