//
// Copyright 2022 DXOS.org
//

import compare from 'compare-semver';
import fs from 'fs';
import { Box, Text, render } from 'ink';
import yaml from 'js-yaml';
import NPM from 'npm-api';
import * as process from 'process';
import React, { FC } from 'react';
import yargs from 'yargs';

import { Client } from '@dxos/client';
import { ConfigObject } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { name, version } from '../package.json';
import { Test } from './Test';
import { AppStateProvider } from './hooks';

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

// TODO(burdon): Util to clear screen.
const clear = () => {
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
};

// TODO(burdon): Command to auto-update.
const versionCheck = async (name: string, version: string): Promise<string | undefined> => {
  const npm = new NPM();
  const repo = await npm.repo(name).package();
  const max = version !== compare.max([repo.version, version]);
  return max ? repo.version : undefined;
};

const VersionUpdate: FC<{ name: string, version: string }> = ({ name, version }) => {
  return (
    <Box
      flexDirection='column'
      margin={1}
      padding={1}
      borderStyle='double'
      borderColor='red'
    >
      <Text>
        New version: {version}
      </Text>
      <Text>
        Update: <Text color='yellow'>npm -g up {name}</Text> or <Text color='yellow'>yarn global upgrade {name}</Text>
      </Text>
    </Box>
  );
};

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
    .command({
      command: '*',
      handler: async ({
        config: configFile,
        debug
      }: {
        config: string,
        debug: boolean
      }) => {
        const newVersion = await versionCheck(name, version);

        // TODO(burdon): Persistence option.
        const config: ConfigObject = yaml.load(fs.readFileSync(configFile, { encoding: 'utf8' })) as ConfigObject;
        const client = new Client(config);
        await client.initialize();

        if (debug) {
          await client.halo.createProfile({ username: 'Test' });
        }

        const { waitUntilExit } = render((
          <ClientProvider client={client}>
            {newVersion && (
              <VersionUpdate name={name} version={newVersion} />
            )}

            <AppStateProvider debug={debug}>
              <Test />
            </AppStateProvider>
          </ClientProvider>
        ));

        await waitUntilExit();
        process.exit();
      }
    })
    .help()
    .argv;
};

void main();
