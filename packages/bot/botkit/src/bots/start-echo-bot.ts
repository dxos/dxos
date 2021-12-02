//
// Copyright 2021 DXOS.org
//

import { createIpcPort } from '../bot-container';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot';
import { startBot } from './start-bot';

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  void startBot(new EchoBot(TEST_ECHO_TYPE), port);
}
