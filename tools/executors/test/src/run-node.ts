//
// Copyright 2022 DXOS.org
//

import { type ExecutorContext } from '@nx/devkit';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { execTool, getBin, resolveFiles } from './node-util';
import { type ExecutionResult } from './types';
import { formatArgs, mochaComment } from './util';

const LOG_TRANSFORM_CONFIG = {
  symbols: [
    {
      function: 'log',
      package: '@dxos/log',
      param_index: 2,
      include_args: false,
      include_call_site: true,
    },
    {
      function: 'invariant',
      package: '@dxos/invariant',
      param_index: 2,
      include_args: true,
      include_call_site: false,
    },
  ],
};

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
  executorResult?: object;
  reporter?: string;
  inspect?: boolean;
  inspectBrk?: boolean;
  trackLeakedResources: boolean;
  grep?: string;
  bail?: boolean;
  envVariables?: Record<string, string>;
  profile: boolean;
  dryRun: boolean;
  reporterOutputPath?: string;
};

export const runNode = async (context: ExecutorContext, options: NodeOptions): Promise<ExecutionResult> => {
  const args = await getNodeArgs(context, options);
  const mocha = getBin(context.root, options.coverage ? 'nyc' : 'mocha');
  console.log(`$ ${mocha} ${args.join(' ')}`);
  const result = await execTool(
    mocha,
    args,

    // TODO(dmaretskyi): Add a switch to run with deopt logs.
    // 'node',
    // [
    //   ...[
    //     'prof',
    //     'log-deopt',
    //     'log-ic',
    //     'log-maps',
    //     'log-maps-details',
    //     'log-internal-timer-events',
    //     'log-code',
    //     'log-source-code',
    //     'detailed-line-info',
    //   ].flatMap((flag) => `--${flag}`),
    //   require.resolve('mocha/bin/mocha'),
    //   ...args,
    // ],
    {
      env: {
        ...process.env,
        ...options.envVariables,
        FORCE_COLOR: '2',
        MOCHA_TAGS: options.tags.join(','),
        MOCHA_ENV: 'nodejs',
        EXECUTOR_RESULT: JSON.stringify(options.executorResult),
        DX_TRACK_LEAKS: options.trackLeakedResources ? '1' : undefined,
        NODE_ENV: 'test',

        // Patch in ts-node will read this.
        // https://github.com/TypeStrong/ts-node/issues/1937
        SWC_PLUGINS: JSON.stringify([[require.resolve('@dxos/swc-log-plugin'), LOG_TRANSFORM_CONFIG]]),
      },
    },
  );

  return result;
};

const getNodeArgs = async (context: ExecutorContext, options: NodeOptions) => {
  const reporterArgs = await setupReporter(context, options);
  const ignoreArgs = await getIgnoreArgs(options.testPatterns);
  const setupArgs = getSetupArgs(context.root, options.domRequired, options.trackLeakedResources, options.profile);
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
      '--inspect-brk': options.inspectBrk,
      '--bail': options.bail,
      '--dry-run': options.dryRun,
    },
    options.grep && ['--grep', options.grep],
  ]);
};

const setupReporter = async (context: ExecutorContext, options: NodeOptions) => {
  // NOTE: A custom reporter may be provided by the IDE.
  if (options.reporter) {
    return [
      '--reporter',
      options.reporter,
      ...(options.reporterOutputPath ? ['--reporter-option', `output=${options.reporterOutputPath}`] : []),
    ];
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
      testsuitesTitle: `${name} nodejs Tests`,
    },
  };

  await mkdir(options.outputPath, { recursive: true });
  await writeFile(reporterConfigFile, JSON.stringify(reporterConfig), 'utf-8');

  return [
    '--reporter',
    options.reporter ?? 'mocha-multi-reporters',
    '--reporter-options',
    `configFile=${reporterConfigFile}`,
  ];
};

const getIgnoreArgs = async (testPatterns: string[]) => {
  const allFiles = await resolveFiles(testPatterns);
  return allFiles
    .filter(([, contents]) => contents.includes(mochaComment('browser')))
    .map(([filename]) => ['--ignore', filename])
    .flat();
};

const getSetupArgs = (root: string, domRequired: boolean, trackLeakedResources: boolean, profile: boolean) => {
  const scripts = [
    'colors',
    'mocha-env',
    'catch-unhandled-rejections',
    ...(trackLeakedResources ? ['trackLeakedResources'] : []),
    ...(domRequired ? ['react-setup'] : []),
    ...(profile ? ['profiler'] : []),
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
    'mocha',
  ];
};
