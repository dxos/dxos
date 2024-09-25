//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import chat from './templates/chat.ts?raw';
// @ts-ignore
import chess from './templates/chess.ts?raw';
// @ts-ignore
import echo from './templates/echo.ts?raw';
// @ts-ignore
import email from './templates/email.ts?raw';
// @ts-ignore
import forex from './templates/forex.ts?raw';

const removeHeader = (str: string) => str.split('\n').slice(4).join('\n');

export type Template = {
  id: string;
  name: string;
  source: string;
  presetId?: string;
};

export const templates: Template[] = [
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
];
