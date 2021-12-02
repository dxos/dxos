//
// Copyright 2021 DXOS.org
//

import { createIpcPort } from '../bot-container';
import { ClientBot } from './client-bot';
import { startBot } from './start-bot';

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  void startBot(new ClientBot(), port);
}
