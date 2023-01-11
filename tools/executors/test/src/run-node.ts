//
// Copyright 2022 DXOS.org
//

import { ExecutorContext } from '@nrwl/devkit';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { execTool, getBin, mochaComment, resolveFiles } from './util';
import { formatArgs } from './util/formatArgs';

export type NodeOptions = {
  testPatterns: string[];
  tags: string[];
  coverage: boolean;
  coveragePath: string;
  watch: boolean;
  watchPatterns: string[];
  outputPath: string;
  resultsPath: string;
  xmlReport: boolean;
  timeout: number;
  checkLeaks: boolean;
  forceExit: boolean;
  domRequired: boolean;
  playwright: boolean;
  browser?: string;
  headless: boolean;
  stayOpen: boolean;
  browserArgs?: string[];
  reporter?: string;
  inspect?: boolean;
  trackLeakedResources: boolean;
  grep?: string;
};

export const runNode = async (context: ExecutorContext, options: NodeOptions) => {

  const args = await getNodeArgs(context, options);
  const mocha = getBin(context.root, options.coverage ? 'nyc' : 'mocha');
  const exitCode = await execTool(mocha, args, {
    env: {
      ...process.env,
      FORCE_COLOR: '2',
      HEADLESS: String(options.headless),
      STAY_OPEN: String(options.stayOpen),
      MOCHA_TAGS: options.tags.join(','),
      MOCHA_ENV: options.browser ?? 'nodejs',
      DX_TRACK_LEAKS: options.trackLeakedResources ? '1' : undefined,

      // Patch in ts-node will read this.
      // https://github.com/TypeStrong/ts-node/issues/1937
      SWC_PLUGINS: JSON.stringify([[require.resolve('@dxos/swc-log-plugin'), {}]])
    }
  });

  return exitCode;
};

const getNodeArgs = async (context: ExecutorContext, options: NodeOptions) => {
  const reporterArgs = await setupReporter(context, options);
  const ignoreArgs = await getIgnoreArgs(options.testPatterns);
  const setupArgs = getSetupArgs(context.root, options.domRequired, options.playwright, options.trackLeakedResources);
  const watchArgs = getWatchArgs(options.watch, options.watchPatterns);
  const coverageArgs = getCoverageArgs(options.coverage, options.coveragePath, options.xmlReport);

  return formatArgs([
    ...coverageArgs,
    ...options.testPatterns,
    ...ignoreArgs,
    ...reporterArgs,
    ['-r', 'ts-node/register'],
    options.domRequired && ['-r', 'jsdom-global/register'],
    ...setupArgs,
    ...watchArgs,
    ['-t', options.timeout],
    {
      '--checkLeaks': options.checkLeaks,
      '--exit': options.forceExit,
      '--inspect': options.inspect,
    },
    options.grep && ['--grep', options.grep],
  ]);
};

const setupReporter = async (context: ExecutorContext, options: NodeOptions) => {
  // NOTE: A custom reporter may be provided by the IDE.
  if (options.reporter) {
    return ['--reporter', options.reporter];
  }

  if (options.watch) {
    return ['--reporter', 'min'];
  }

  if (!options.xmlReport) {
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
    '--reporter',
    options.reporter ?? 'mocha-multi-reporters',
    '--reporter-options',
    `configFile=${reporterConfigFile}`
  ];
};

const getIgnoreArgs = async (testPatterns: string[]) => {
  const allFiles = await resolveFiles(testPatterns);
  return allFiles
    .filter(([, contents]) => contents.includes(mochaComment('browser')))
    .map(([filename]) => ['--ignore', filename])
    .flat();
};

const getSetupArgs = (root: string, domRequired: boolean, playwright: boolean, trackLeakedResources: boolean) => {
  const scripts = [
    'colors',
    'mocha-env',
    'catch-unhandled-rejections',
    ...(trackLeakedResources ? ['trackLeakedResources'] : []),
    ...(domRequired ? ['react-setup'] : []),
    ...(playwright ? ['playwright'] : [])
  ];

  return scripts
    .map((script) => join(root, 'tools/executors/test/dist/src/setup', `${script}.js`))
    .map((script) => ['-r', script])
    .flat();
};

const getWatchArgs = (watch: boolean, patterns: string[]) => {
  if (!watch) {
    return [];
  }

  return ['--watch', ...patterns.map((pattern) => ['--watch-files', pattern]).flat()];
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
    'mocha'
  ];
};
