//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { Config, Space } from '@dxos/client';

import { Bot } from './bot';

export type BotConstructor = () => Bot;

/**
 * Mock bot manager.
 */
export class BotManager {
  // prettier-ignore
  constructor(
    private readonly _botMap: Map<string, BotConstructor>
  ) {}

  async create(config: Config, botId: string, space: Space): Promise<Bot> {
    const constructor = this._botMap.get(botId);
    invariant(constructor);

    const bot = constructor();
    await bot.init(config, space);
    return bot;
  }
}
