//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { Binoculars, Sword } from 'phosphor-react';
import { FC, useMemo } from 'react';

import { Space } from '@dxos/client';
import { EchoDatabase } from '@dxos/echo-schema';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useModules } from '@dxos/react-metagraph';

import { ResearchBot, Bot, ChessBot } from '../bots';
import { useAppState } from './useAppState';

export type BotDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    constructor: (db: EchoDatabase) => Bot<any>;
  };
};

export const defs: BotDef[] = [
  {
    module: {
      id: 'dxos.module.bot.research',
      type: 'dxos.module.bot',
      displayName: 'ResearchBot',
      description: 'Background data analysis and text matching.'
    },
    runtime: {
      Icon: Binoculars,
      constructor: (db: EchoDatabase) => new ResearchBot(db)
    }
  },
  {
    module: {
      id: 'dxos.module.bot.chess',
      type: 'dxos.module.bot',
      displayName: 'ChessBot',
      description: 'Basic chess engine.'
    },
    runtime: {
      Icon: Sword,
      constructor: (db: EchoDatabase) => new ChessBot(db)
    }
  }
];

/**
 * Mock bot manager.
 */
export class BotManager {
  private readonly _active = new Map<string, Bot<any>>();

  start(botId: string, space: Space) {
    const def = defs.find((def) => def.module.id === botId);
    assert(def);
    const { constructor } = def.runtime;
    const bot = constructor(space.experimental.db); // TODO(burdon): New API.
    this._active.set(botId, bot);
    void bot.start();
  }

  stop(botId: string) {
    const bot = this._active.get(botId);
    if (bot) {
      bot.stop();
    }
  }
}

export const botModules: Module[] = defs.map(({ module }) => module);

export type BotMap = Map<string, BotDef>;

export const useBots = (): { bots: BotMap; active: string[] } => {
  const { modules } = useModules({ type: 'dxos.module.bot' });
  const { bots: active = [] } = useAppState()!;
  const bots = useMemo(
    () =>
      modules.reduce((map, module) => {
        const def = defs.find((def) => def.module.id === module.id);
        assert(def);
        map.set(module.id!, def);
        return map;
      }, new Map<string, BotDef>()),
    [modules]
  );

  return { bots, active };
};
