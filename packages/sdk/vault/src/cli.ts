//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { startVault } from './server';

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('dx-vault')
    .option('configPath', {
      description: 'Path to the config file',
      requiresArg: false,
      type: 'string',
    })
    .option('envPath', {
      description: 'Path to the env file',
      requiresArg: false,
      type: 'string',
    })
    .option('devPath', {
      description: 'Path to the dev file',
      requiresArg: false,
      type: 'string',
    })
    .command({
      command: '*',
      describe: 'Start the vault server',
      handler: async (args: { configPath: string; envPath: string; devPath: string }) => {
        await startVault({ config: args });
      },
    }).argv;
};

void main();
