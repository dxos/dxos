//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { Space } from '@dxos/client';

import { Bot } from './bot';

export type BotConstructor = () => Bot;

/**
 * Mock bot manager.
 */
export class BotManager {
  constructor(private readonly _botMap: Map<string, BotConstructor>) {}

  async create(botId: string, space: Space): Promise<Bot> {
    const constructor = this._botMap.get(botId);
    assert(constructor);

    const bot = constructor();
    await bot.init(space.db);
    return bot;
  }
}
