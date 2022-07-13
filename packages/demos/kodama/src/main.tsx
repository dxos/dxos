//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import { render } from 'ink';
import yaml from 'js-yaml';
import * as process from 'process';
import React from 'react';
import yargs from 'yargs';

import { ConfigObject } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

// TODO(burdon): Util to clear screen.
const clear = () => {
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
};

/**
 * Command line parser.
 */
const main = () => {
  yargs
    .scriptName('kodama')
    .option('config', {
      description: 'Config file',
      type: 'string',
      default: `${process.cwd()}/config/config.yml`
    })
    .command({
      command: '*',
      handler: async ({ config: configFile }: { config: string }) => {
        // TODO(burdon): Config persistent profile.
        const config: ConfigObject = yaml.load(fs.readFileSync(configFile, { encoding: 'utf8' })) as ConfigObject;
        clear();

        const { waitUntilExit } = render((
          <ClientProvider config={config}>
            <App />
          </ClientProvider>
        ));

        await waitUntilExit();
        process.exit();
      }
    })
    .help()
    .argv;
};

main();
