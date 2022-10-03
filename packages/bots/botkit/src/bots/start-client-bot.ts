//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { createIpcPort } from '../bot-container';
import { Bot } from './client-bot';
import { startBot } from './start-bot';

const log = debug('dxos:bot:client-bot');

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  log('Starting client bot');
  void startBot(new Bot(), port);
}
