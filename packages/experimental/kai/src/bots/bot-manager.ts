//
// Copyright 2023 DXOS.org
//

import { Space } from '@dxos/client';

import { BotDef } from '../hooks';
import { Bot } from './bot';

/**
 * Mock bot manager.
 */
export class BotManager {
  private readonly _active = new Map<string, Bot>();

  constructor(private readonly _defs: BotDef[]) {}

  async create(botId: string, space: Space): Promise<Bot> {
    const {
      runtime: { constructor }
    } = this._defs.find((def) => def.module.id === botId)!;

    const bot = constructor();
    await bot.init(space.db);
    this._active.set(botId, bot);

    return bot;
  }
}
