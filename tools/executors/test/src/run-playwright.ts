//
// Copyright 2023 DXOS.org
//

import { type ExecutorContext } from '@nx/devkit';

import { execTool, getBin } from './node-util';
import { type BrowserType } from './types';
import { formatArgs } from './util';

export type PlaywrightOptions = {
  testPatterns: string[];
  playwrightConfigPath: string;
  coverage: boolean;
  coveragePath: string;
  watch: boolean;
  outputPath: string;
  resultsPath: string;
  xmlReport: boolean;
  timeout: number;
  executorResult?: object;
  browsers: BrowserType[];
  headless: boolean;
  extensionPath: string;
  inspect?: boolean;
};

export const runPlaywright = async (context: ExecutorContext, options: PlaywrightOptions) => {
  const coverageArgs = getCoverageArgs(options.coverage, options.coveragePath, options.xmlReport);
  const args = formatArgs([
    ...coverageArgs,
    'test',
    '--config',
    options.playwrightConfigPath,
    { '--debug': options.inspect },
  ]);
  const playwright = getBin(context.root, options.coverage ? 'nyc' : 'playwright');
  const exitCode = await execTool(playwright, args, {
    env: {
      ...process.env,
      BROWSERS: options.browsers.join(','),
      EXECUTOR_RESULT: JSON.stringify(options.executorResult),
      EXTENSION_PATH: options.extensionPath,
      HEADLESS: String(options.headless),
      OUTPUT_PATH: options.outputPath,
      RESULTS_PATH: options.xmlReport ? options.resultsPath : undefined,
      TIMEOUT: String(options.timeout),
      WATCH: String(options.watch),
    },
  });

  return exitCode;
};

const getCoverageArgs = (coverage: boolean, outputPath: string, xmlReport: boolean) => {
  if (!coverage) {
    return [];
  }

  return [
    '--reporter',
    xmlReport ? 'clover' : 'lcov',
    '--temp-dir',
    `${outputPath}/.nyc_output`,
    '--report-dir',
    outputPath,
    'playwright',
  ];
};
