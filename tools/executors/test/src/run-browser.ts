//
// Copyright 2021 DXOS.org
//

import { ExecutorContext } from '@nrwl/devkit';
import chalk from 'chalk';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { buildTests, getNewBrowserContext, outputResults, runTests } from './browser';
import { resolveFiles } from './node-util';
import { BrowserType } from './types';
import { mochaComment } from './util';

export type BrowserOptions = {
  browser: BrowserType;
  testPatterns: string[];
  tags: string[];
  outputPath: string;
  resultsPath: string;
  xmlReport: boolean;
  timeout: number;
  checkLeaks: boolean;
  stayOpen: boolean;
  headless: boolean;
  debug: boolean;
  browserArgs?: string[];
};

export const runBrowser = async (context: ExecutorContext, options: BrowserOptions) => {
  console.log(chalk`\nRunning in {blue {bold ${options.browser}}}\n`);

  const { page } = await getNewBrowserContext(options.browser, options);
  const results = await runTests(page, options.browser, join(options.outputPath, 'out/bundle.js'), options);
  const exitCode = await outputResults(results, {
    name: context.projectName!,
    browserType: options.browser,
    outDir: options.xmlReport ? options.resultsPath : undefined
  });

  if (options.stayOpen) {
    console.log(
      `\nCompleted with ${exitCode === 0 ? chalk`{green success}` : chalk`{red failure}`}. Browser window stays open.`
    );

    await new Promise((resolve) => {
      page.on('close', resolve);
    });
  }

  return exitCode;
};

export const runBrowserBuild = async (options: BrowserOptions) => {
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

  if (testFiles.length === 0) {
    console.log(chalk`\n{yellow Warning: No browser tests to run.}\n`);
    return true;
  }

  // TODO(wittjosiah): Factor out (only build tests once for all browser envs).
  await buildTests(testFiles, {
    debug: !!options.debug,
    outDir,
    timeout: options.timeout,
    checkLeaks: options.checkLeaks,
    tags: options.tags
  });

  return false;
};
