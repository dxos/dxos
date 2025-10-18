//
// Copyright 2024 DXOS.org
//

import chat from './chat.ts?raw';
import chess from './chess.ts?raw';
import dataGenerator from './data-generator.ts?raw';
import discord from './discord.ts?raw';
import echo from './echo.ts?raw';
import email from './email.ts?raw';
import forexEffect from './forex-effect.ts?raw';
import forex from './forex.ts?raw';
import gmail from './gmail.ts?raw';

const removeHeader = (str: string) => str.split('\n').slice(4).join('\n');

export { dataGenerator };

export type Template = {
  id: string;
  name: string;
  source: string;
  presetId?: string;
};

export const templates = [
  {
    id: 'dxos.org/script/echo',
    name: 'Echo',
    source: removeHeader(echo),
  },
  {
    id: 'dxos.org/script/forex',
    name: 'Forex',
    source: removeHeader(forex),
  },
  {
    id: 'dxos.org/script/forex-effect',
    name: 'Forex (Effect)',
    source: removeHeader(forexEffect),
  },
  {
    id: 'dxos.org/script/gpt',
    name: 'Gpt',
    source: removeHeader(chat),
    presetId: 'dxos.org/function/gpt',
  },
  {
    id: 'dxos.org/script/chess',
    name: 'Chess',
    source: removeHeader(chess),
    presetId: 'dxos.org/function/chess',
  },
  {
    id: 'dxos.org/script/email',
    name: 'Email',
    source: removeHeader(email),
    presetId: 'dxos.org/function/email',
  },
  {
    id: 'dxos.org/script/discord',
    name: 'Discord',
    source: removeHeader(discord),
    presetId: 'dxos.org/function/discord',
  },
  {
    id: 'dxos.org/script/gmail',
    name: 'Gmail',
    source: removeHeader(gmail),
    presetId: 'dxos.org/function/gmail',
  },
  {
    id: 'dxos.org/script/data-generator',
    name: 'Data Generator',
    source: removeHeader(dataGenerator),
    presetId: 'dxos.org/function/data-generator',
  },
] as const;
