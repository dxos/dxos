//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

import { BotContainer } from '../bot-container';
import { BotController } from '../bot-controller';
import { BotFactory } from '../bot-factory';
import { BotFactoryClient } from './bot-factory-client';

export const setup = async (container: BotContainer, [agentPort, botControllerPort]: [RpcPort, RpcPort]) => {
  const botFactoryClient = new BotFactoryClient(agentPort);
  const botFactory = new BotFactory(container);

  const botController = new BotController(botFactory, botControllerPort);

  await Promise.all([
    botController.start(),
    botFactoryClient.start()
  ]);
};
