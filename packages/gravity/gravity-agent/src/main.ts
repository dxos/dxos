//
// Copyright 2022 DXOS.org
//
import fs from 'fs';
import yaml from 'js-yaml';
import { join } from 'path';
import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { TestBuilder } from '@dxos/client/testing';
import { ProtoCodec } from '@dxos/codec-protobuf';
import { Config, ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentSpec } from '@dxos/protocols/proto/dxos/gravity';

import { Agent } from './agent';
import { testStateMachineFactory } from './statemachine';

// TODO(burdon): Logging meta doesn't work when running from pnpm agent.
log.config({
  filter: 'info'
});

const parseYamlWithSchema = <T>(codec: ProtoCodec<T>, yamlSource: string): T => codec.fromObject(yaml.load(yamlSource));

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
      handler: async ({
        verbose,
        config: configFilepath,
        spec: specFilepath
      }: {
        verbose?: boolean;
        config: string;
        spec: string;
      }) => {
        try {
          const config: ConfigProto = yaml.load(fs.readFileSync(configFilepath).toString()) as ConfigProto;
          if (verbose) {
            log.info('config', { config });
          }

          const spec: AgentSpec = parseYamlWithSchema(
            schema.getCodecForType('dxos.gravity.AgentSpec'),
            fs.readFileSync(specFilepath).toString()
          );
          if (verbose) {
            log.info('spec', { spec });
          }
          const testBuilder = new TestBuilder(new Config(config));
          const services = testBuilder.createClientServicesHost();
          const stateMachine = testStateMachineFactory(spec.stateMachine!);
          const agent = new Agent({ config, services, spec, stateMachine });
          await agent.initialize();
          await agent.start();
          await agent.stop();
          log.info('Done');
          process.exit(0);
        } catch (err: any) {
          log.error(err);
          process.exit(1);
        }
      }
    }).argv;
  // parser.parse();
  log('Tests are running...');
};

void main();
