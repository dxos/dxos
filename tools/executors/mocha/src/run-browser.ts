//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { join } from 'node:path';

import { BrowserType, getNewBrowserContext, outputResults, runTests } from './browser';

export type BrowserOptions = {
  testPatterns: string[]
  outputPath: string
  resultsPath: string
  timeout: number
  signalServer: boolean
  setup?: string
  stayOpen: boolean
  headless: boolean
  checkLeaks: boolean
  debug: boolean
  browserArgs?: string[]
}

export const runBrowser = async (name: string, browserType: BrowserType, options: BrowserOptions) => {
  console.log(chalk`\nRunning in {blue {bold ${browserType}}}`);

  const { page } = await getNewBrowserContext(browserType, options);
  const results = await runTests(page, browserType, join(options.outputPath, 'out/bundle.js'), options);
  const exitCode = await outputResults(results, options.resultsPath, name, browserType);
  if (exitCode !== 0) {
    console.log(chalk`\n{red Failed with exit code ${exitCode} in {blue {bold ${browserType}}}}\n`);
  } else {
    console.log(chalk`\n{green Passed in {blue {bold ${browserType}}}}\n`);
  }

  const shouldFail = (exitCode !== 0);

  if (options.stayOpen) {
    console.log(`\nCompleted with ${shouldFail ? 'failure' : 'success'}. Browser window stays open.`);

    await new Promise(resolve => {
      page.on('close', resolve);
    });
  }

  return !shouldFail;
};
