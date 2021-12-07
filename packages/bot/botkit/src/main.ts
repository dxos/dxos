//
// Copyright 2021 DXOS.org
//

import { PublicKey } from "@dxos/crypto"
import { NetworkManager } from "@dxos/network-manager";

import { BotFactory } from "./bot-factory";
import { InProcessBotContainer } from "./bot-container";
import { EchoBot ,TEST_ECHO_TYPE} from "./bots/echo-bot";
import { BotController } from "./bot-controller";

const main = async () => {
  const topic = PublicKey.fromHex('e61469c04e4265e145f9863dd4b84fd6dee8f31e10160c38f9bb3c289e3c09bc');

  const botContainer = new InProcessBotContainer(() => new EchoBot(TEST_ECHO_TYPE));
  const botFactory = new BotFactory(botContainer);
  
  const networkManager = new NetworkManager({
    signal: ['ws://localhost:4000'],
  });
  const controller = new BotController(botFactory, networkManager);
  await controller.start(topic);

  console.log(`Listening on ${topic}`);
}

void main();
