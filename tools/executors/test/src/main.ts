//
// Copyright 2022 DXOS.org
//

import { type ExecutorContext, logger, runExecutor } from '@nx/devkit';
import chalk from 'chalk';
import { resolve } from 'node:path';

import { type BrowserOptions, runBrowser, runBrowserBuild } from './run-browser';
import { type NodeOptions, runNode } from './run-node';
import { type PlaywrightOptions, runPlaywright } from './run-playwright';
import { type BrowserType, BrowserTypes, type TestEnvironment, TestEnvironments } from './types';
import { runSetup } from './util';

export type MochaExecutorOptions = NodeOptions &
  BrowserOptions &
  PlaywrightOptions & {
    environments?: (TestEnvironment | 'all' | 'core')[];
    devEnvironments: TestEnvironment[];
    ciEnvironments: TestEnvironment[];
    serve?: string;
    serveOptions?: { [key: string]: string };
    setup?: string;
    setupOptions?: Record<string, any>;
    envVariables?: Record<string, string>;
  };

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  logger.info('Executing test...');
  if (context.isVerbose) {
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const environments = getEnvironments(options);
  const resolvedOptions: RunTestsOptions = {
    ...options,
    environments,
    browsers: environments.filter((env): env is BrowserType => env !== 'nodejs'),
    setup: options.setup ? resolve(context.root, options.setup) : options.setup,
    testPatterns: options.testPatterns.map((pattern) => resolve(context.root, pattern)),
    watchPatterns: options.watchPatterns?.map((pattern) => resolve(context.root, pattern)),
    outputPath: resolve(context.root, options.outputPath),
    resultsPath: resolve(context.root, options.resultsPath),
    coveragePath: resolve(context.root, options.coveragePath),
    headless: options.stayOpen ? false : options.headless,
    envVariables: options.envVariables,
  };

  const includesBrowserEnv =
    !options.playwrightConfigPath &&
    resolvedOptions.environments.filter((environment) => ([...BrowserTypes.values()] as string[]).includes(environment))
      .length > 0;

  const [skipBrowserTests] = await Promise.all([
    includesBrowserEnv && runBrowserBuild(resolvedOptions),
    resolvedOptions.setup && runSetup({ script: resolvedOptions.setup, options: resolvedOptions.setupOptions }),
  ]);

  let success = false;
  if (options.serve) {
    const [project, target] = options.serve.split(':');

    // TODO(wittjosiah): Servers seem to shut down during tests.
    //   Pages can be loaded during beforeAll but no reloaded during tests.
    for await (const { success: _, ...executorResult } of await runExecutor(
      { project, target },
      options.serveOptions ?? {},
      context,
    )) {
      try {
        success = await runTests({ ...resolvedOptions, skipBrowserTests, executorResult }, context);
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
      : options.environments.includes('core')
      ? ['nodejs', ...Array.from(BrowserTypes)]
      : (options.environments as TestEnvironment[]);
  } else if (process.env.CI) {
    return options.ciEnvironments;
  } else if (options.devEnvironments) {
    return options.devEnvironments;
  }

  return options.playwrightConfigPath ? ['chromium'] : ['nodejs'];
};

// TODO(wittjosiah): Clean up the types used in this executor.
export type RunTestsOptions = Omit<MochaExecutorOptions, 'environments'> & {
  environments: TestEnvironment[];
  skipBrowserTests?: boolean;
  executorResult?: object;
};

// TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
// TODO(wittjosiah): Run all even if there are failures.
const runTests = async (options: RunTestsOptions, context: ExecutorContext) => {
  if (options.playwrightConfigPath) {
    const exitCode = await runPlaywright(context, options);
    return exitCode === 0;
  }

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
