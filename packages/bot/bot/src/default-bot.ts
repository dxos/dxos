//
// Copyright 2020 DXOS.org
//

// Executable file for the default bot.

import { Bot } from './bot';
import { getConfig } from './config';

const config = getConfig();

console.log(config.values);

console.log(process.env);

new Bot(config, {}).start();
