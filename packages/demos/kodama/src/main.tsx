//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import compare from 'compare-semver';
import fs from 'fs';
import { render } from 'ink';
import yaml from 'js-yaml';
import NPM from 'npm-api';
import * as process from 'process';
import React from 'react';
import yargs from 'yargs';

import { ConfigObject } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { name, version } from '../package.json';
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

const warning = (lines: string[]) => {
  const max = lines.reduce((max, value) => Math.max(max, value.length), 0);
  console.warn(chalk.red('#'.padEnd(max + 3, '=') + '#'));
  lines.forEach(line => console.warn(chalk.red('# ') + line.padEnd(max) + chalk.red(' #')));
  console.warn(chalk.red('#'.padEnd(max + 3, '=') + '#'));
};

/**
 * Command line parser.
 */
const main = async () => {
  clear();

  const npm = new NPM();
  const repo = await npm.repo('@dxos/kodama').package();
  if (version !== compare.max([repo.version, version])) {
    // TODO(burdon): Command to auto-update.
    warning([
      `New version: ${repo.version}`,
      `Update: "npm -g up ${name}" or "yarn global upgrade ${name}"`
    ]);
  }

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

void main();
