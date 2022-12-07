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
import { AgentSpec } from '@dxos/protocols/proto/dxos/gravity';

import { Agent } from './agent';

// TODO(burdon): Logging meta doesn't work when running from pnpm agent.
log.config({
  filter: 0
});

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
    .option('spec', {
      // TODO(burdon): Define protobuf type.
      type: 'string',
      default: join(process.cwd(), './config/spec.yml')
    })
    .command({
      command: 'start',
      handler: async ({
        verbose,
        config: configFilepath,
        spec: specFilepath
      }: {
        verbose?: boolean;
        config: string;
        spec: string;
      }) => {
        const config: ConfigProto = yaml.load(fs.readFileSync(configFilepath).toString()) as ConfigProto;
        if (verbose) {
          log('config', { config });
        }

        const spec: AgentSpec = yaml.load(fs.readFileSync(specFilepath).toString()) as ConfigProto;
        if (verbose) {
          log('spec', { spec });
        }

        // TODO(burdon): Start with config; e.g., create party and invitation from pre-configured swarm.
        const agent = await new Agent({ config, spec });
        await agent.initialize();
        await agent.start();
      }
    })
    .help().argv;
};

void main();
