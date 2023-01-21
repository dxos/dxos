//
// Copyright 2023 DXOS.org
//

import { Binoculars, Sword } from 'phosphor-react';
import React, { Context, createContext, Dispatch, FC, ReactNode, SetStateAction, useContext, useState } from 'react';

import { EchoDatabase } from '@dxos/echo-schema';

import { ResearchBot, Bot, ChessBot } from '../bots';
import { useSpace } from './useSpace';

export enum BotID {
  RESEARCH = 'research-bot',
  CHESS = 'chess-bot'
}

// TODO(burdon): Change type to id.
export type BotDef = {
  id: BotID;
  system?: boolean;
  title: string;
  description?: string;
  Icon: FC<any>;
  constructor: (db: EchoDatabase) => Bot<any>;
};

const bots: BotDef[] = [
  {
    id: BotID.RESEARCH,
    Icon: Binoculars,
    title: 'ResearchBot',
    description: 'Background data analysis and text matching.',
    constructor: (db: EchoDatabase) => new ResearchBot(db)
  },
  {
    id: BotID.CHESS,
    Icon: Sword,
    title: 'ChessBot',
    description: 'Basic chess engine.',
    constructor: (db: EchoDatabase) => new ChessBot(db)
  }
];

export type BotMap = { [index: string]: BotDef };

export type BotsContextType = {
  bots: BotMap;
  active: BotID[];
};

const createBotMap = (bots: BotDef[]): BotMap =>
  bots.reduce((map: BotMap, bot) => {
    map[bot.id] = bot;
    return map;
  }, {});

export type BotsStateContextType = [BotsContextType, Dispatch<SetStateAction<BotsContextType>>];

export const BotsContext: Context<BotsStateContextType | undefined> = createContext<BotsStateContextType | undefined>(
  undefined
);

export const BotsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO(burdon): useDMG.
  const [state, setState] = useState<BotsContextType>({ bots: createBotMap(bots), active: [] });
  return <BotsContext.Provider value={[state, setState]}>{children}</BotsContext.Provider>;
};

export const useBots = (): BotMap => {
  const [{ bots }] = useContext(BotsContext)!;
  return bots;
};

export const useActiveBots = (): BotDef[] => {
  const [{ active, bots }] = useContext(BotsContext)!;
  return active.map((id) => bots[id]);
};

export const useBotDispatch = () => {
  const space = useSpace();
  const [, dispatch] = useContext(BotsContext)!;
  return (id: BotID, state: boolean) => {
    dispatch((context: BotsContextType) => {
      const { bots, active } = context;
      if (active.findIndex((active) => active === id) !== -1) {
        return context;
      }

      const { constructor } = bots[id];
      const bot = constructor(space.experimental.db);
      void bot.start();

      return {
        bots,
        active: [...active, id]
      };
    });
  };
};
