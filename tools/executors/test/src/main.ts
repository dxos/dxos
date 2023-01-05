//
// Copyright 2022 DXOS.org
//

import { ExecutorContext, runExecutor } from '@nrwl/devkit';
import fetch, { Response } from 'node-fetch';
import { resolve } from 'node:path';

import { BrowserOptions, runBrowser as runBrowserMocha, runBrowserBuild } from './run-browser';
import { NodeOptions, runNode } from './run-node';
import { runPlaywright } from './run-playwright';
import { BrowserTypes, TestEnvironment, TestEnvironments } from './types';
import { poll, runSetup } from './util';

export type MochaExecutorOptions = NodeOptions &
  BrowserOptions & {
    environments?: (TestEnvironment | 'all')[];
    devEnvironments: TestEnvironment[];
    ciEnvironments: TestEnvironment[];
    playwright?: boolean;
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

  const runBrowser = options.playwright ? runPlaywright : runBrowserMocha;

  if (options.serve) {
    const [project, target, port] = options.serve.split(':');
    const iterator = await runExecutor({ project, target }, {}, context);
    void iterator.next();
    await poll<Response | undefined>(
      async () => {
        console.log(`Polling port ${port}...`);
        try {
          return await fetch(`http://localhost:${port}`);
        } catch {
          return undefined;
        }
      },
      (res) => (res ? res.status < 400 : false)
    );
  }

  // TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
  // TODO(wittjosiah): Run all even if there are failures.
  let success = true;
  for (const env of resolvedOptions.environments) {
    switch (env) {
      case 'chromium':
      case 'firefox':
      case 'webkit': {
        success &&= skipBrowserTests || (await runBrowser(context, { ...resolvedOptions, browser: env }));
        break;
      }

      case 'nodejs': {
        success &&= await runNode(context, resolvedOptions);
        break;
      }

      default: {
        throw new Error(`Invalid env: ${env}`);
      }
    }
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
