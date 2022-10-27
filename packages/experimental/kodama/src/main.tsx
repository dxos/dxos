//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import * as process from 'process';
import yargs from 'yargs';

import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { name, version } from '../package.json';
import { start } from './start';
import { clear, versionCheck } from './util';
import { showVersion } from './version';

// NOTE: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

// TODO(burdon): Global error handler.

/**
 * Command line parser.
 */
const main = async () => {
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
    .option('skip-version-check', {
      description: "Don't check for new NPM version",
      type: 'boolean',
      default: false
    })
    .command({
      command: '*',
      handler: async ({
        config: configFile,
        username,
        debug,
        skipVersionCheck
      }: {
        config: string;
        username: string;
        debug: boolean;
        skipVersionCheck: boolean;
      }) => {
        if (!skipVersionCheck) {
          console.log('Checking version...');
          const newVersion = await versionCheck(name, version);
          if (newVersion) {
            showVersion(name, newVersion);
            process.exit();
          }
        }

        // Create client.
        const config: ConfigProto = yaml.load(fs.readFileSync(configFile, { encoding: 'utf-8' })) as ConfigProto;
        const client = new Client(config);
        await client.initialize();

        if (username) {
          await client.halo.createProfile({ username });
        }

        clear();
        await start(client, { debug });
        process.exit();
      }
    })
    .help().argv;
};

void main();
