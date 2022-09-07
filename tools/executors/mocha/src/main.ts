//
// Copyright 2022 DXOS.org
//

// NOTE: The import order here is important.
// The `require` hooks that are registered in those modules will be run in the same order as they are imported.
// We want the logger preprocessor to be run on typescript source first.
// Then the SWC will transpile the typescript source to javascript.
import '@dxos/log/register';
import '@swc-node/register';

import type { ExecutorContext } from '@nrwl/devkit';
import glob from 'glob';
import Mocha from 'mocha';
import { resolve } from 'path';

import './util/react-setup';
import './util/catch-unhandled-rejections';

export interface MochaExecutorOptions {
  testPatterns: string[]
  jsdom: boolean
  timeout: number
}

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const mocha = new Mocha({ timeout: options.timeout });

  if (options.jsdom) {
    await import('jsdom-global/register');
  }

  options.testPatterns.forEach(pattern => {
    glob.sync(pattern).forEach(path => {
      mocha.addFile(resolve(context.root, path));
    });
  });

  const failures = await new Promise(resolve => mocha.run(failures => resolve(failures)));

  return { success: !failures };
};
