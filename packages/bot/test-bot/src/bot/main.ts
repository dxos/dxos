//
// Copyright 2021 DXOS.org
//

import { EchoBot, TEST_ECHO_TYPE, startBot, createIpcPort } from '@dxos/bot-factory';

if (typeof require !== 'undefined' && require.main === module) {
  void startBot(new EchoBot(TEST_ECHO_TYPE), createIpcPort(process));
}