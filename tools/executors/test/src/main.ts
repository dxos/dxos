//
// Copyright 2022 DXOS.org
//

import { ExecutorContext, runExecutor } from '@nrwl/devkit';
import chalk from 'chalk';
import { resolve } from 'node:path';

import { BrowserOptions, runBrowser as runBrowserMocha, runBrowserBuild } from './run-browser';
import { NodeOptions, runNode } from './run-node';
import { BrowserTypes, TestEnvironment, TestEnvironments } from './types';
import { runSetup } from './util';

export type MochaExecutorOptions = NodeOptions &
  BrowserOptions & {
    environments?: (TestEnvironment | 'all')[];
    devEnvironments: TestEnvironment[];
    ciEnvironments: TestEnvironment[];
    serve?: string;
    setup?: string;
  };

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing mocha...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const resolvedOptions = {
    ...options,
    environments: getEnvironments(options),
    setup: options.setup ? resolve(context.root, options.setup) : options.setup,
    testPatterns: options.testPatterns.map((pattern) => resolve(context.root, pattern)),
    watchPatterns: options.watchPatterns?.map((pattern) => resolve(context.root, pattern)),
    outputPath: resolve(context.root, options.outputPath),
    resultsPath: resolve(context.root, options.resultsPath),
    coveragePath: resolve(context.root, options.coveragePath),
    headless: options.stayOpen ? false : options.headless
  };

  const includesBrowserEnv =
    !options.playwright &&
    resolvedOptions.environments.filter((environment) => ([...BrowserTypes.values()] as string[]).includes(environment))
      .length > 0;

  const [skipBrowserTests] = await Promise.all([
    includesBrowserEnv && runBrowserBuild(resolvedOptions),
    resolvedOptions.setup && runSetup(resolvedOptions.setup)
  ]);

  if (options.serve) {
    const [project, target] = options.serve.split(':');
    const iterator = await runExecutor({ project, target }, {}, context);
    void iterator.next();
  }

  // TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
  // TODO(wittjosiah): Run all even if there are failures.
  let success = true;
  for (const env of resolvedOptions.environments) {
    let exitCode: number | null;

    switch (env) {
      case 'chromium':
      case 'firefox':
      case 'webkit': {
        if (skipBrowserTests) {
          exitCode = -1;
          break;
        }

        const runBrowser = options.playwright ? runNode : runBrowserMocha;
        exitCode = await runBrowser(context, { ...resolvedOptions, browser: env });
        break;
      }

      case 'nodejs': {
        exitCode = await runNode(context, resolvedOptions);
        break;
      }

      default: {
        throw new Error(`Invalid env: ${env}`);
      }
    }

    if (exitCode === 0) {
      console.log(chalk`\n{green Passed in {blue {bold ${env}}}}\n`);
    } else if (!exitCode || exitCode > 0) {
      console.log(chalk`\n{red Failed with exit code ${exitCode} in {blue {bold ${env}}}}\n`);
    }

    success &&= exitCode === null ? false : exitCode <= 0;
  }

  return { success };
};

const getEnvironments = (options: MochaExecutorOptions) => {
  if (options.environments) {
    return options.environments.includes('all') ? TestEnvironments : (options.environments as TestEnvironment[]);
  } else if (options.playwright) {
    return BrowserTypes;
  } else if (process.env.CI) {
    return options.ciEnvironments;
  }

  return options.devEnvironments;
};
