//
// Copyright 2023 DXOS.org
//

import { Config, Profile } from '@dxos/config';

import { DiscordBot } from './bot';

const main = async () => {
  const config = new Config(Profile());
  const bot = new DiscordBot(config);
  await bot.start();
};

void main();
