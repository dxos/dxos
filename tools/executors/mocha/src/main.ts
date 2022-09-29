//
// Copyright 2022 DXOS.org
//

// NOTE: The import order here is important.
// The `require` hooks that are registered in those modules will be run in the same order as they are imported.
// We want the logger preprocessor to be run on typescript source first.
// Then the SWC will transpile the typescript source to javascript.
import '@dxos/log-hook/register';
import '@swc-node/register';

import type { ExecutorContext } from '@nrwl/devkit';
import { resolve } from 'path';

import { Browser, BrowserOptions, runBrowser } from './run-browser';
import { NodeOptions, runNode } from './run-node';

export type TestEnvironment = 'nodejs' | Browser

export type MochaExecutorOptions = NodeOptions & BrowserOptions & {
  environments: TestEnvironment[]
};

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  options = {
    ...options,
    testPatterns: options.testPatterns.map(pattern => resolve(context.root, pattern)),
    setup: options.setup ? resolve(context.root, options.setup) : options.setup
  };

  // TODO(wittjosiah): Run each in parallel in child process?
  // TODO(wittjosiah): Run all even if there are failures.
  let success = true;
  for (const env of options.environments) {
    switch (env) {
      case 'chromium':
      case 'firefox':
      case 'webkit': {
        success &&= await runBrowser(env, options);
        break;
      }

      case 'nodejs': {
        const failures = await runNode(options);
        success &&= !failures;
        break;
      }
    }
  }

  return { success };
};
