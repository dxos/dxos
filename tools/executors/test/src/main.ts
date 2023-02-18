//
// Copyright 2022 DXOS.org
//

import { ExecutorContext, logger, runExecutor } from '@nrwl/devkit';
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
    serveOptions?: { [key: string]: string };
    setup?: string;
  };

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  logger.info('Executing mocha...');
  if (context.isVerbose) {
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const resolvedOptions: RunTestsOptions = {
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

  let success = false;
  if (options.serve) {
    const [project, target] = options.serve.split(':');

    // TODO(wittjosiah): Provide base url to tests from executor?
    // Based on https://github.com/nrwl/nx/blob/a5766a8/packages/cypress/src/executors/cypress/cypress.impl.ts#L63-L72.
    for await (const _ of await runExecutor({ project, target }, options.serveOptions ?? {}, context)) {
      try {
        success = await runTests({ ...resolvedOptions, skipBrowserTests }, context);
        if (!options.watch) {
          break;
        }
      } catch (err: any) {
        logger.error(err.message);
        if (!options.watch) {
          break;
        }
      }
    }
  } else {
    success = await runTests({ ...resolvedOptions, skipBrowserTests }, context);
  }

  return { success };
};

const getEnvironments = (options: MochaExecutorOptions): TestEnvironment[] => {
  if (options.environments) {
    return options.environments.includes('all')
      ? Array.from(TestEnvironments)
      : (options.environments as TestEnvironment[]);
  } else if (process.env.CI) {
    return options.playwright ? options.ciEnvironments.filter((env) => env !== 'nodejs') : options.ciEnvironments;
  } else if (options.devEnvironments) {
    return options.devEnvironments;
  }

  return options.playwright ? ['chromium'] : ['nodejs'];
};

// TODO(wittjosiah): Clean up the types used in this executor.
export type RunTestsOptions = Omit<MochaExecutorOptions, 'environments'> & {
  environments: TestEnvironment[];
  skipBrowserTests?: boolean;
};

// TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
// TODO(wittjosiah): Run all even if there are failures.
const runTests = async (options: RunTestsOptions, context: ExecutorContext) => {
  let success = true;
  for (const env of options.environments) {
    let exitCode: number | null;

    switch (env) {
      case 'chromium':
      case 'firefox':
      case 'webkit': {
        if (options.skipBrowserTests) {
          exitCode = -1;
          break;
        }

        const runBrowser = options.playwright ? runNode : runBrowserMocha;
        exitCode = await runBrowser(context, { ...options, browser: env });
        break;
      }

      case 'nodejs': {
        exitCode = await runNode(context, options);
        break;
      }

      default: {
        throw new Error(`Invalid env: ${env}`);
      }
    }

    if (exitCode === 0) {
      logger.log(chalk`\n{green Passed in {blue {bold ${env}}}}\n`);
    } else if (!exitCode || exitCode > 0) {
      logger.log(chalk`\n{red Failed with exit code ${exitCode} in {blue {bold ${env}}}}\n`);
    }

    success &&= exitCode === null ? false : exitCode <= 0;
  }

  return success;
};
