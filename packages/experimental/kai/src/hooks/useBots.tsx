//
// Copyright 2023 DXOS.org
//

import { Binoculars, Sword } from 'phosphor-react';
import React, { Context, createContext, Dispatch, FC, ReactNode, SetStateAction, useContext, useState } from 'react';

import { EchoDatabase } from '@dxos/echo-schema';
import { Module } from '@dxos/protocols/proto/dxos/config';

import { ResearchBot, Bot, ChessBot } from '../bots';
import { useSpace } from './useSpace';

export type BotDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    constructor: (db: EchoDatabase) => Bot<any>;
  };
};

export const bots: BotDef[] = [
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

export type BotMap = Map<string, BotDef>;

export type BotsContextType = {
  bots: BotMap;
  active: string[];
};

const createBotMap = (bots: BotDef[]): BotMap =>
  bots.reduce((map: BotMap, bot) => {
    map.set(bot.module.id!, bot);
    return map;
  }, new Map<string, BotDef>());

export type BotsStateContextType = [BotsContextType, Dispatch<SetStateAction<BotsContextType>>];

export const BotsContext: Context<BotsStateContextType | undefined> = createContext<BotsStateContextType | undefined>(
  undefined
);

export const BotsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO(burdon): useDMG.
  const [state, setState] = useState<BotsContextType>({ bots: createBotMap(bots), active: [] });
  return <BotsContext.Provider value={[state, setState]}>{children}</BotsContext.Provider>;
};

export const useBots = (): { bots: BotMap; active: string[] } => {
  const [{ bots, active }] = useContext(BotsContext)!;
  return { bots, active };
};

export const useBotDispatch = () => {
  const space = useSpace();
  const [, dispatch] = useContext(BotsContext)!;
  return (id: string, state: boolean) => {
    dispatch((context: BotsContextType) => {
      const { bots, active } = context;
      if (active.findIndex((active) => active === id) !== -1) {
        return context;
      }

      // TODO(burdon): Start bot.
      const { constructor } = bots.get(id)!;
      const bot = constructor(space.experimental.db);
      void bot.start();

      return {
        bots,
        active: [...active, id]
      };
    });
  };
};
