//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import * as process from 'process';
import yargs from 'yargs';

import { Client, Config } from '@dxos/client';

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
    .option('displayName', {
      description: 'Create initial display name',
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
        displayName,
        debug,
        skipVersionCheck
      }: {
        config: string;
        displayName: string;
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
        const config = new Config(yaml.load(fs.readFileSync(configFile, { encoding: 'utf8' })) as any);
        const client = new Client({ config });
        await client.initialize();

        if (displayName) {
          await client.halo.createProfile({ displayName });
        }

        clear();
        await start(client, { debug });
        process.exit();
      }
    })
    .help().argv;
};

void main();
