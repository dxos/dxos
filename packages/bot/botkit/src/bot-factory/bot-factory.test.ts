//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { sleep } from '@dxos/async';

import { NodeContainer } from '../bot-container';
import { Bot } from '../proto/gen/dxos/bot';
import { BotFactory } from './bot-factory';
import { MockContentLoader } from '../testutils';

describe('BotFactory', () => {
  describe('with NodeContainer', () => {
    it('crashed bots get their status updated', async () => {
      const container = new NodeContainer(['@swc-node/register']);
      const contentLoader = new MockContentLoader();
      const botFactory = new BotFactory(contentLoader, container);

      const bot = await botFactory.SpawnBot({
        package: { localPath: require.resolve('../bots/failing-bot') }
      });

      void botFactory.SendCommand({
        botId: bot.id,
        command: new Uint8Array()
      }); // Do not wait because the bot process will crash.

      // TODO(dmaretskyi): Replace with waiting for update from bot-factory.
      await sleep(100);

      const { bots } = await botFactory.GetBots();
      expect(bots[0].status).toEqual(Bot.Status.STOPPED);
      expect(bots[0].exitCode).toEqual(255);
    });
  });
});
