//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { createIpcPort } from '../bot-container';
import { startBot } from './start-bot';
import { StoryBot } from './story-bot';

const log = debug('dxos:story-bot');

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  log('Starting story bot');
  void startBot(new StoryBot(), port);
}
