#!/usr/bin/env node

const { BrowserContainer, BotFactory, NodeBotContainer, BROWSER_ENV, NODE_ENV, getConfig } = require('@dxos/botkit');

const config = getConfig();

new BotFactory(config, {
  [NODE_ENV]: new NodeBotContainer(config.get('cli.nodePath')),
  [BROWSER_ENV]: new BrowserContainer()
}).start();
