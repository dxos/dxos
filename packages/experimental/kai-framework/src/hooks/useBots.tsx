//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { type Module } from '@dxos/protocols/proto/dxos/config';
import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useKeyStore } from '@dxos/react-client/halo';

import { BotClient } from '../bots';

export const botModules: Module[] = [
  {
    id: 'dxos.module.bot.store',
    type: 'dxos.org/type/bot',
    displayName: 'Store',
    description: 'Secure storage.',
  },
  {
    id: 'dxos.module.bot.mail',
    type: 'dxos.org/type/bot',
    displayName: 'EMail',
    description: 'Email sync.',
  },
  {
    id: 'dxos.module.bot.chess',
    type: 'dxos.org/type/bot',
    displayName: 'Chess',
    description: 'Basic chess engine.',
  },
  {
    id: 'dxos.module.bot.kai',
    type: 'dxos.org/type/bot',
    displayName: 'Kai',
    description: 'Research and task assistant.',
  },
];

// TODO(burdon): Bot KMS in HALO?
export const botKeys: { [key: string]: string } = {
  'com.amadeus.client_id': 'COM_AMADEUS_CLIENT_ID',
  'com.amadeus.client_secret': 'COM_AMADEUS_CLIENT_SECRET',
  'com.protonmail.username': 'COM_PROTONMAIL_USERNAME',
  'com.protonmail.password': 'COM_PROTONMAIL_PASSWORD',
  'com.protonmail.tls': 'COM_PROTONMAIL_TLS',
  'openai.com/org_id': 'COM_OPENAI_ORG_ID',
  'openai.com/api_key': 'COM_OPENAI_API_KEY',
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
