//
// Copyright 2020 DXOS.org
//

import path from 'path';
import { sync as findPkgJson } from 'pkg-up';

import { createId, randomBytes } from '@dxos/crypto';

import { BotInfo } from '../bot-manager';
import { BROWSER_ENV } from '../env';
import { BrowserContainer } from './browser-container';

test.skip('Start & stop bot', async () => {
  const container = new BrowserContainer();
  await container.start({ controlTopic: randomBytes() });

  const botInfo: BotInfo = {
    botId: createId(),
    id: createId(),
    recordName: createId(),
    env: BROWSER_ENV,
    installDirectory: path.join(path.dirname(findPkgJson({ cwd: __dirname })!), 'res/test/package'),
    name: 'bot',
    parties: [],
    spawnOptions: {
      env: BROWSER_ENV
    },
    storageDirectory: `out/bots/${createId()}`,
    started: 0,
    lastActive: 0,
    stopped: false
  };
  await container.startBot(botInfo);
  await container.stopBot(botInfo);

  await container.stop();
});
