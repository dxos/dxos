//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { createIpcPort } from '../bot-container';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot';
import { startBot } from './start-bot';

const log = debug('dxos:bot:echo-bot');

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  log('Starting echo bot');
  void startBot(new EchoBot(TEST_ECHO_TYPE), port);
}
