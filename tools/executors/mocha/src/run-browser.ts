//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserType, buildTests, getNewBrowserContext, outputResults, runTests } from './browser';
import { mochaComment, resolveFiles } from './util';

export type BrowserOptions = {
  testPatterns: string[]
  outputPath: string
  resultsPath: string
  junitReport: boolean
  timeout: number
  checkLeaks: boolean
  stayOpen: boolean
  headless: boolean
  debug: boolean
  browserArgs?: string[]
}

export const runBrowser = async (
  name: string,
  browserType: BrowserType,
  options: BrowserOptions
) => {
  const outDir = join(options.outputPath, 'out');

  try {
    await mkdir(outDir, { recursive: true });
  } catch (e: any) {
    console.error(e);
  }

  const allFiles = await resolveFiles(options.testPatterns);
  const testFiles = allFiles
    .filter(([, contents]) => !contents.includes(mochaComment('nodejs')))
    .map(([filename]) => filename);

  await buildTests(testFiles, {
    debug: !!options.debug,
    outDir,
    checkLeaks: options.checkLeaks
  });

  console.log(chalk`\nRunning in {blue {bold ${browserType}}}\n`);

  const { page } = await getNewBrowserContext(browserType, options);
  const results = await runTests(page, browserType, join(outDir, 'bundle.js'), options);
  const exitCode = await outputResults(results, {
    name,
    browserType,
    outDir: options.junitReport ? options.resultsPath : undefined
  });
  if (exitCode !== 0) {
    console.log(chalk`\n{red Failed with exit code ${exitCode} in {blue {bold ${browserType}}}}\n`);
  } else {
    console.log(chalk`\n{green Passed in {blue {bold ${browserType}}}}\n`);
  }

  const success = (exitCode === 0);

  if (options.stayOpen) {
    console.log(`\nCompleted with ${success ? 'success' : 'failure'}. Browser window stays open.`);

    await new Promise(resolve => {
      page.on('close', resolve);
    });
  }

  return success;
};
