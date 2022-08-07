//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import * as process from 'process';
import yargs from 'yargs';

import { Client } from '@dxos/client';
import { ConfigObject } from '@dxos/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { name, version } from '../package.json';
import { start } from './start';
import { clear, versionCheck } from './util';

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

/**
 * Command line parser.
 */
const main = async () => {
  clear();

  yargs
    .scriptName('kodama')
    .option('config', {
      description: 'Config file',
      type: 'string',
      default: `${process.cwd()}/config/config.yml`
    })
    .option('debug', {
      description: 'Debug mode (run in-memory)',
      type: 'boolean'
    })
    .option('username', {
      description: 'Create initial profile',
      type: 'string'
    })
    .command({
      command: '*',
      handler: async ({
        config: configFile,
        username,
        debug
      }: {
        config: string,
        username: string
        debug: boolean
      }) => {
        const newVersion = await versionCheck(name, version);

        // TODO(burdon): Persistence option.
        const config: ConfigObject = yaml.load(fs.readFileSync(configFile, { encoding: 'utf8' })) as ConfigObject;
        const client = new Client(config);
        await client.initialize();

        if (username) {
          await client.halo.createProfile({ username });
        }

        await start(client, {
          debug,
          update: newVersion ? {
            name,
            version: newVersion
          } : undefined
        });

        process.exit();
      }
    })
    .help()
    .argv;
};

void main();
