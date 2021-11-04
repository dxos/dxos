#!/usr/bin/env node
/* eslint-disable */

const { BrowserContainer, BotFactory, NodeBotContainer, BROWSER_ENV, NODE_ENV, getConfig } = require('@dxos/botkit-deprecated');

const config = getConfig();

new BotFactory(config, {
  [NODE_ENV]: new NodeBotContainer(config.get('cli.nodePath')),
  [BROWSER_ENV]: new BrowserContainer()
}).start();
