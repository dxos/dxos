//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { Binoculars, Sword } from 'phosphor-react';
import { FC, useMemo } from 'react';

import { Bot, ChessBot, KaiBot } from '@dxos/bots';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useModules } from '@dxos/react-metagraph';

import { useAppState } from './useAppState';

export type BotDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    constructor: () => Bot;
  };
};

export const botDefs: BotDef[] = [
  {
    module: {
      id: 'dxos.module.bot.chess',
      type: 'dxos:type/bot',
      displayName: 'ChessBot',
      description: 'Basic chess engine.'
    },
    runtime: {
      Icon: Sword,
      constructor: () => new ChessBot()
    }
  },
  {
    module: {
      id: 'dxos.module.bot.kai',
      type: 'dxos:type/bot',
      displayName: 'KaiBot',
      description: 'Background research and data analysis.'
    },
    runtime: {
      Icon: Binoculars,
      constructor: () => new KaiBot()
    }
  }
];

export const botModules: Module[] = botDefs.map(({ module }) => module);

export type BotMap = Map<string, BotDef>;

export const useBots = (): { bots: BotMap; active: string[] } => {
  const { modules } = useModules({ type: 'dxos:type/bot' });
  const { bots: active = [] } = useAppState()!;
  const bots = useMemo(
    () =>
      modules.reduce((map, module) => {
        const def = botDefs.find((def) => def.module.id === module.id);
        assert(def);
        map.set(module.id!, def);
        return map;
      }, new Map<string, BotDef>()),
    [modules]
  );

  return { bots, active };
};
