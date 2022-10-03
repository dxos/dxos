//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { resolve } from 'node:path';

import { BrowserTypes } from './browser';
import { BrowserOptions, runBrowser } from './run-browser';
import { NodeOptions, runNode } from './run-node';
import { runSetup } from './util';

export const TestEnvironments = [
  'all',
  'nodejs',
  ...BrowserTypes
] as const;

export type TestEnvironment = typeof TestEnvironments[number];

export type MochaExecutorOptions = NodeOptions & BrowserOptions & {
  environments: TestEnvironment[]
  setup?: string
};

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  options = {
    ...options,
    environments: options.environments.includes('all') ? TestEnvironments.slice(1) : options.environments,
    setup: options.setup ? resolve(context.root, options.setup) : options.setup,
    testPatterns: options.testPatterns.map(pattern => resolve(context.root, pattern)),
    watchPatterns: options.watchPatterns?.map(pattern => resolve(context.root, pattern)),
    outputPath: resolve(context.root, options.outputPath),
    resultsPath: resolve(context.root, options.resultsPath),
    headless: options.stayOpen ? false : options.headless
  };

  options.setup && await runSetup(options.setup);

  // TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
  // TODO(wittjosiah): Run all even if there are failures.
  let success = true;
  for (const env of options.environments) {
    switch (env) {
      case 'chromium':
      case 'firefox':
      case 'webkit': {
        success &&= await runBrowser(context.projectName!, env, options);
        break;
      }

      case 'nodejs': {
        success &&= await runNode(context, options);
        break;
      }
    }
  }

  return { success };
};
