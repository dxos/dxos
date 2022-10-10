//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { sleep } from '@dxos/async';
import { Config } from '@dxos/config';
import { Bot } from '@dxos/protocols/proto/dxos/bot';

import { NodeContainer } from '../bot-container/index.js';
import { BotFactory } from './bot-factory.js';

describe('BotFactory', function () {
  describe('with NodeContainer', function () {
    // TODO(egorgripasov): Redo test with Bots auto-restart in mind.
    it.skip('crashed bots get their status updated', async function () {
      const container = new NodeContainer(['@swc-node/register']);
      const botFactory = new BotFactory({
        botContainer: container,
        config: new Config({})
      });

      const bot = await botFactory.spawnBot({
        package: {
          localPath: require.resolve('../bots/failing-bot')
        }
      });

      void botFactory.sendCommand({
        botId: bot.id,
        command: new Uint8Array()
      }); // Do not wait because the bot process will crash.

      // TODO(dmaretskyi): Replace with waiting for update from bot-factory.
      await sleep(100);

      const { bots } = await botFactory.getBots();
      expect(bots[0].status).toEqual(Bot.Status.STOPPED);
      expect(bots[0].runtime?.exitCode).toEqual(255);
    });
  });
});
