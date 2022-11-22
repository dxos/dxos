//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import { join } from 'path';
import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

import { Agent } from './agent';

// TODO(burdon): Logging meta doesn't work when running from pnpm agent.

const main = () => {
  yargs(hideBin(process.argv))
    .scriptName('agent')
    .option('json', {
      type: 'boolean'
    })
    .option('verbose', {
      type: 'boolean'
    })
    .option('config', {
      type: 'string',
      default: join(process.cwd(), './config/config.yml')
    })
    // TODO(burdon): Define protobuf type.
    .option('spec', {
      type: 'string',
      default: join(process.cwd(), './config/spec.yml')
    })

    .command({
      command: 'start',
      handler: async ({ verbose, config: configFilepath }: { verbose?: boolean; config: string }) => {
        const config: ConfigProto = yaml.load(fs.readFileSync(configFilepath).toString()) as ConfigProto;
        if (verbose) {
          log('config', { config });
        }

        // TODO(burdon): Start with config; e.g., create party and invitation from pre-configured swarm.
        const agent = await new Agent(config);
        await agent.initialize();
        await agent.start();
      }
    })
    .help().argv;
};

void main();
