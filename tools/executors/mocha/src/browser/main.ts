//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { resolve } from 'path';

import { Browser, run } from './runner';

export interface BrowserExecutorOptions {
  testPatterns: string[]
  browsers: Browser[]
  browserArgs?: string[]
  stayOpen: boolean
  headless: boolean
  checkLeaks: boolean
  debug: boolean
  setup?: string
}

export default async (options: BrowserExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha-browser"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const success = await run({
    ...options,
    testPatterns: options.testPatterns.map(pattern => resolve(context.root, pattern)),
    setup: options.setup ? resolve(context.root, options.setup) : options.setup
  });

  return { success };
};
