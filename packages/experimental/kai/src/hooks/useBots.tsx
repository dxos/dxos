//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { Binoculars, Envelope, Sword } from 'phosphor-react';
import { FC, useMemo } from 'react';

import { Space } from '@dxos/client';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useConfig } from '@dxos/react-client';
import { useModules } from '@dxos/react-metagraph';

import { BotClient } from './bot-client';
import { useAppState } from './useAppState';
import { useKeyStore } from './useKeyStore';

export type BotDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    constructor: () => void;
  };
};

export const botDefs: BotDef[] = [
  {
    module: {
      id: 'dxos.module.bot.mail',
      type: 'dxos:type/bot',
      displayName: 'MailBot',
      description: 'Email sync.'
    },
    runtime: {
      Icon: Envelope,
      constructor: () => undefined
    }
  },
  {
    module: {
      id: 'dxos.module.bot.chess',
      type: 'dxos:type/bot',
      displayName: 'ChessBot',
      description: 'Basic chess engine.'
    },
    runtime: {
      Icon: Sword,
      constructor: () => undefined
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
      constructor: () => undefined
    }
  }
];

export const botModules: Module[] = botDefs.map(({ module }) => module);

export type BotMap = Map<string, BotDef>;

export const botKeys: { [key: string]: string } = {
  'com.protonmail.username': 'COM_PROTONMAIL_USERNAME',
  'com.protonmail.password': 'COM_PROTONMAIL_PASSWORD'
};

export const getBotEnvs = (keyMap: Map<string, string>) => {
  const envMap = new Map<string, string>();
  Object.entries(botKeys).forEach(([key, env]) => {
    envMap.set(env, keyMap.get(key) ?? '');
  });

  return envMap;
};

// TODO(burdon): Add to context.
export const useBotClient = (space: Space) => {
  const config = useConfig();
  const [keys] = useKeyStore(['dxos.services.bot.proxy']);
  const proxy = keys.get('dxos.services.bot.proxy');
  return useMemo(() => new BotClient(config, space, { proxy }), [config, space, proxy]);
};

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
