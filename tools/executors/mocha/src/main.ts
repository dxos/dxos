//
// Copyright 2022 DXOS.org
//

// NOTE: The import order here is important.
//   The `require` hooks that are registered in those modules will be run in the same order as they are imported.
//   We want the logger preprocessor to be run on typescript source first.
//   Then the SWC will transpile the typescript source to javascript.
import '@dxos/log-hook/register';
import '@swc-node/register';

import type { ExecutorContext } from '@nrwl/devkit';
import chokidar from 'chokidar';
import { join, resolve } from 'node:path';

import { BrowserType } from './browser';
import { BrowserOptions, runBrowser } from './run-browser';
import { NodeOptions, runNode } from './run-node';
import { runSetup } from './util';

export type TestEnvironment = 'nodejs' | BrowserType

export type MochaExecutorOptions = NodeOptions & BrowserOptions & {
  environments: TestEnvironment[]
  watch: boolean
  watchPatterns?: string[]
};

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  options = {
    ...options,
    testPatterns: options.testPatterns.map(pattern => resolve(context.root, pattern)),
    watchPatterns: options.watchPatterns?.map(pattern => resolve(context.root, pattern)),
    headless: options.stayOpen ? true : options.headless,
    setup: options.setup ? resolve(context.root, options.setup) : options.setup
  };

  await setup(options);

  if (options.watch) {
    const watcher = chokidar.watch(options.watchPatterns ?? options.testPatterns, {
      ignored: /(^|[/\\])\../ // ignore dotfiles
    });

    watcher.on('ready', async () => {
      await run(options);

      watcher.on('change', async () => {
        await run(options);
      });
    });

    // TODO(wittjosiah): Better way to wait?
    await new Promise(resolve => {
      process.on('exit', resolve);
    });

    return { success: true };
  }

  const success = await run(options);

  return { success };
};

const run = async (options: MochaExecutorOptions): Promise<boolean> => {
  // TODO(wittjosiah): Run in parallel and aggregate test results from all environments to a single view.
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

  return success;
};

const setup = async (options: MochaExecutorOptions): Promise<void> => {
  const runNode = options.environments.includes('nodejs');
  const runBrowser = options.environments.filter(env => env === 'nodejs').length > 0;

  const nodeSetup = [
    './setup/mocha-env',
    './setup/react-setup',
    './setup/catch-unhandled-rejections',
    ...(options.domRequired ? ['./setup/dom-setup'] : [])
  ];

  const browserSetup = [
    './setup/browser-setup'
  ];

  const setupScripts = [
    ...(runNode ? nodeSetup : []),
    ...(runBrowser ? browserSetup : []),
    ...(options.signalServer ? ['./setup/create-signal-server'] : [])
  ].map(path => join(__dirname, path));

  await runSetup([
    ...setupScripts,
    ...(options.setup ? [options.setup] : [])
  ], options);
};
