//
// Copyright 2023 DXOS.org
//

import { ExecutorContext } from '@nrwl/devkit';
import chalk from 'chalk';
import { join } from 'node:path';

import { getNodeArgs, NodeOptions } from './run-node';
import { BrowserType } from './types';
import { execTool, getBin } from './util';

export type PlaywrightOptions = Omit<NodeOptions, 'domRequired'> & {
  browser: BrowserType;
  stayOpen: boolean;
  headless: boolean;
  browserArgs?: string[];
};

export const runPlaywright = async (context: ExecutorContext, options: PlaywrightOptions) => {
  const args = [
    ...(await getNodeArgs(context, {
      ...options,
      domRequired: false
    })),
    '-r',
    join(context.root, 'tools/executors/test/dist/src/setup', 'playwright.js')
  ];

  const mocha = getBin(context.root, options.coverage ? 'nyc' : 'mocha');
  const exitCode = await execTool(mocha, args, {
    env: {
      ...process.env,
      FORCE_COLOR: '2',
      HEADLESS: String(options.headless),
      STAY_OPEN: String(options.stayOpen),
      MOCHA_ENV: options.browser,
      MOCHA_TAGS: options.tags.join(',')
    }
  });

  if (exitCode === 0) {
    console.log(chalk`\n{green Passed in {blue {bold ${options.browser}}}}\n`);
  } else {
    console.log(chalk`\n{red Failed with exit code ${exitCode} in {blue {bold ${options.browser}}}}\n`);
  }

  return !exitCode;
};
