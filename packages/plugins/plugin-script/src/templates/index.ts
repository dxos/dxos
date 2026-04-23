//
// Copyright 2024 DXOS.org
//

import anthropic from './anthropic.ts?raw';
import chat from './chat.ts?raw';
import chessBot from './chess-bot.ts?raw';
import commentary from './commentary.ts?raw';
import dataGenerator from './data-generator.ts?raw';
import discord from './discord.ts?raw';
import email from './email.ts?raw';
import forexEffect from './forex-effect.ts?raw';
import forex from './forex.ts?raw';
import gmail from './gmail.ts?raw';
import ping from './ping.ts?raw';

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
    id: 'org.dxos.script.ping',
    name: 'Ping',
    source: removeHeader(ping),
  },
  {
    id: 'org.dxos.script.forex',
    name: 'Forex',
    source: removeHeader(forex),
  },
  {
    id: 'org.dxos.script.forex-effect',
    name: 'Forex (Effect)',
    source: removeHeader(forexEffect),
  },
  {
    id: 'org.dxos.script.gpt',
    name: 'Gpt',
    source: removeHeader(chat),
    presetId: 'org.dxos.function.gpt',
  },
  {
    id: 'org.dxos.script.chess-bot',
    name: 'Chess Bot',
    source: removeHeader(chessBot),
    presetId: 'org.dxos.function.chess-bot',
  },
  {
    id: 'org.dxos.script.email',
    name: 'Email',
    source: removeHeader(email),
    presetId: 'org.dxos.function.email',
  },
  {
    id: 'org.dxos.script.discord',
    name: 'Discord',
    source: removeHeader(discord),
    presetId: 'org.dxos.function.discord',
  },
  {
    id: 'org.dxos.script.gmail',
    name: 'Gmail',
    source: removeHeader(gmail),
    presetId: 'org.dxos.function.gmail',
  },
  {
    id: 'org.dxos.script.data-generator',
    name: 'Data Generator',
    source: removeHeader(dataGenerator),
    presetId: 'org.dxos.function.data-generator',
  },
  {
    id: 'org.dxos.script.anthropic',
    name: 'Anthropic',
    source: removeHeader(anthropic),
  },
  {
    id: 'org.dxos.script.commentary',
    name: 'Commentary',
    source: removeHeader(commentary),
    presetId: 'org.dxos.function.chess.commentary',
  },
] as const;
