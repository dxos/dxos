//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { createIpcPort } from '../bot-container/index.js';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot.js';
import { startBot } from './start-bot.js';

const log = debug('dxos:bot:echo-bot');

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  log('Starting echo bot');
  void startBot(new EchoBot(TEST_ECHO_TYPE), port);
}
