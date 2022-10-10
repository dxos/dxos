//
// Copyright 2022 DXOS.org
//

import { ExecutorContext } from '@nrwl/devkit';
import { assert } from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { execTool, getBin, mochaComment, resolveFiles } from './util/index.js';

export type NodeOptions = {
  testPatterns: string[]
  coverage: boolean
  coveragePath: string
  watch: boolean
  watchPatterns: string[]
  outputPath: string
  resultsPath: string
  xmlReport: boolean
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
  const coverageArgs = getCoverageArgs(options.coverage, options.coveragePath, options.xmlReport);

  // Absolute path to the project root.
  const projectRoot = join(context.root, context.workspace.projects[context.projectName!].root);
  assert(projectRoot);

  const args = [
    ...coverageArgs,
    ...ignoreArgs,
    ...reporterArgs,

    // NOTE: The import order here is important.
    //   The `require` hooks that are registered in those modules will be run in the same order as they are imported.
    //   We want the logger preprocessor to be run on typescript source first.
    //   Then the SWC will transpile the typescript source to javascript.

    // This will register a hook that will be consumed by ts-node/esm loader.
    // The hook injects logger line numbers into the source code.
    '-r', '@dxos/log-hook/register.cjs',

    // TODO(dmaretskyi): Remove this once we don't have any CJS tests.
    '-r', '@swc-node/register',

    ...(options.domRequired ? ['-r', require.resolve('jsdom-global/register')] : []),
    ...setupArgs,
    ...watchArgs,
    '-t', String(options.timeout),
    ...(options.checkLeaks ? ['--checkLeaks'] : []),
    ...(options.forceExit ? ['--exit'] : []),

    '--extension', 'ts',
    '--extension', 'tsx',
    '--extension', 'js',
    '--extension', 'jsx',

    // Loader for typescript files.
    // TODO(dmaretskyi): Consider https://github.com/lukeed/tsm.
    `--loader=${require.resolve('ts-node/esm')}`,

    ...options.testPatterns
  ];

  const mocha = getBin(context.root, options.coverage ? 'nyc' : 'mocha');
  const exitCode = await execTool(mocha, args, {
    env: {
      ...process.env,
      'FORCE_COLOR': '2'
    },

    // NOTE: Running mocha in the project directory is required for ts-node to load it's config correctly.
    cwd: projectRoot
  });

  return !exitCode;
};

const setupReporter = async (context: ExecutorContext, options: NodeOptions) => {
  if (options.watch) {
    return ['--reporter', 'min'];
  } else if (!options.xmlReport) {
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
    'colors',
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

const getCoverageArgs = (coverage: boolean, outputPath: string, xmlReport: boolean) => {
  if (!coverage) {
    return [];
  }

  return [
    '--reporter', (xmlReport ? 'clover' : 'lcov'),
    '--report-dir', outputPath,
    'mocha'
  ];
};
