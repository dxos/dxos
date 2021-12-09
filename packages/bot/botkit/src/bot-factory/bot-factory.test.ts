import { BotFactory } from "./bot-factory";
import { NodeContainer } from "../bot-container";
import { sleep } from "@dxos/async";
import expect from 'expect'
import { Bot } from "../proto/gen/dxos/bot";

describe('BotFactory', () => {
  describe('with NodeContainer', () => {
    it('crashed bots get their status updated', async () => {
      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const botFactory = new BotFactory(container);

      const bot = await botFactory.SpawnBot({
        package: { localPath: require.resolve('../bots/failing-bot')}
      });

      void botFactory.SendCommand({
        botId: bot.id,
        command: new Uint8Array(),
      }); // Do not wait because the bot process will crash.

      // TODO(dmaretskyi): Replace with waiting for update from bot-factory.
      await sleep(100);

      const { bots } = await botFactory.GetBots();
      expect(bots[0].status).toEqual(Bot.Status.STOPPED);
      expect(bots[0].exitCode).toEqual(255);
    })
  })
})