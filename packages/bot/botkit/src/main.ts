import { PublicKey } from "@dxos/crypto"
import { BotFactory } from "./bot-factory";
import { InProcessBotContainer } from "./bot-container";
import { EchoBot ,TEST_ECHO_TYPE} from "./bots/echo-bot";
import { createProtocolFactory, NetworkManager, StarTopology } from "@dxos/network-manager";
import { PluginRpc } from '@dxos/protocol-plugin-rpc'
import { BotController } from ".";

const main = async () => {
  const topic = PublicKey.fromHex('e61469c04e4265e145f9863dd4b84fd6dee8f31e10160c38f9bb3c289e3c09bc');

  const botContainer = new InProcessBotContainer(() => new EchoBot(TEST_ECHO_TYPE));
  const botFactory = new BotFactory(botContainer);
  
  const networkManager = new NetworkManager({
    signal: ['ws://localhost:4000'],
  });
  networkManager.joinProtocolSwarm({
    topic,
    peerId: topic,
    topology: new StarTopology(topic),
    protocol: createProtocolFactory(topic, topic, [new PluginRpc(async (port) => {
      const controller = new BotController(botFactory, port);
      await controller.start();
    })])
  })

  console.log(`Listening on ${topic}`);
}

main();