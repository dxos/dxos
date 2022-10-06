//
// Copyright 2022 DXOS.org
//

import { ExecutorContext } from '@nrwl/devkit';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { execTool, getBin, mochaComment, resolveFiles } from './util';

export type NodeOptions = {
  testPatterns: string[]
  watch: boolean
  watchPatterns: string[]
  outputPath: string
  resultsPath: string
  junitReport: boolean
  timeout: number
  checkLeaks: boolean
  forceExit: boolean
  domRequired: boolean
}

export const runNode = async (context: ExecutorContext, options: NodeOptions) => {
  const reporterArgs = await setupReporter(context, options);
  const ignoreArgs = await getIgnoreArgs(options.testPatterns);
  const setupArgs = getSetupArgs(context.root, options.domRequired);
  const watchArgs = getWatchArgs(options.watch, options.watchPatterns);

  const args = [
    ...options.testPatterns,
    ...ignoreArgs,
    ...reporterArgs,
    // NOTE: The import order here is important.
    //   The `require` hooks that are registered in those modules will be run in the same order as they are imported.
    //   We want the logger preprocessor to be run on typescript source first.
    //   Then the SWC will transpile the typescript source to javascript.
    '-r', '@dxos/log-hook/register',
    '-r', '@swc-node/register',
    '-r', require.resolve('./colors'),
    ...(options.domRequired ? ['-r', 'jsdom-global/register'] : []),
    ...setupArgs,
    ...watchArgs,
    '-t', String(options.timeout),
    ...(options.checkLeaks ? ['--checkLeaks'] : []),
    ...(options.forceExit ? ['--exit'] : [])
  ];

  const mocha = getBin(context.root, 'mocha');
  const exitCode = await execTool(mocha, args, {
    env: {
      ...process.env,
      'FORCE_COLOR': '2'
    }
  });

  return !exitCode;
};

const setupReporter = async (context: ExecutorContext, options: NodeOptions) => {
  if (options.watch) {
    return ['--reporter', 'min'];
  } else if (!options.junitReport) {
    return ['--reporter', 'spec'];
  }

  const name = context.projectName!;
  const reporterConfigFile = join(options.outputPath, 'config.json');
  const reporterConfig = {
    reporterEnabled: 'spec, mocha-junit-reporter',
    mochaJunitReporterReporterOptions: {
      mochaFile: join(options.resultsPath, 'nodejs.xml'),
      testsuitesTitle: `${name} nodejs Tests`
    }
  };
  await mkdir(options.outputPath, { recursive: true });
  await writeFile(reporterConfigFile, JSON.stringify(reporterConfig), 'utf-8');

  return [
    '--reporter', 'mocha-multi-reporters',
    '--reporter-options', `configFile=${reporterConfigFile}`
  ];
};

const getIgnoreArgs = async (testPatterns: string[]) => {
  const allFiles = await resolveFiles(testPatterns);
  return allFiles
    .filter(([, contents]) => contents.includes(mochaComment('browser')))
    .map(([filename]) => ['--ignore', filename])
    .flat();
};

const getSetupArgs = (root: string, domRequired: boolean) => {
  const scripts = [
    'mocha-env',
    'catch-unhandled-rejections',
    ...(domRequired ? ['react-setup'] : [])
  ];

  return scripts
    .map(script => join(root, 'tools/executors/mocha/dist/src/setup', `${script}.js`))
    .map(script => ['-r', script])
    .flat();
};

const getWatchArgs = (watch: boolean, patterns: string[]) => {
  if (!watch) {
    return [];
  }

  return [
    '--watch',
    ...patterns.map(pattern => ['--watch-files', pattern]).flat()
  ];
};
