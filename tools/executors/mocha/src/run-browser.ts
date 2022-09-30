//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { join } from 'node:path';

import { BrowserType, getNewBrowserContext, runTests } from './browser';
import { TEMP_DIR } from './setup/browser-setup';

export type BrowserOptions = {
  testPatterns: string[]
  timeout: number
  signalServer: boolean
  setup?: string
  stayOpen: boolean
  headless: boolean
  checkLeaks: boolean
  debug: boolean
  browserArgs?: string[]
}

export const runBrowser = async (browserType: BrowserType, options: BrowserOptions) => {
  console.log(chalk`Running in {blue {bold ${browserType}}}`);

  const { page } = await getNewBrowserContext(browserType, options);
  const exitCode = await runTests(page, browserType, join(TEMP_DIR, 'bundle.js'), options);
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
