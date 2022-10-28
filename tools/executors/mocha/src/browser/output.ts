//
// Copyright 2022 DXOS.org
//

import { XMLBuilder } from 'fast-xml-parser';
import { Stats } from 'mocha';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserType } from './browser';
import { TestResult, TestStatus } from './reporter';
import { RunTestsResults, Suites, TestError } from './run-tests';

export type OutputResultsOptions = {
  name: string;
  browserType: BrowserType;
  outDir?: string;
};

/**
 * Attempts to approximate Mocha's spec reported from a results JSON string.
 */
export const outputResults = async (results: RunTestsResults, options: OutputResultsOptions) => {
  const { suites, stats } = results;

  logSuites(suites);
  console.log('\n');

  if (stats.passes > 0) {
    console.log(indent(1), stats.passes, 'passing', `(${stats.duration}ms)`);
  }
  if (stats.pending > 0) {
    console.log(indent(1), stats.pending, 'pending');
  }
  if (stats.failures > 0) {
    console.log(indent(1), stats.failures, 'failing');

    suites.errors.forEach(({ suite, test, message }, index) => {
      console.error('\n', indent(1), `${index + 1})`, suite.join(' '));
      console.error(indent(3), `${test}:`);
      console.error(indent(2), message);
    });
  }

  if (options.outDir) {
    const xml = buildXmlReport(results, options);
    await mkdir(options.outDir, { recursive: true });
    await writeFile(join(options.outDir, `${options.browserType}.xml`), xml, 'utf-8');
  }

  return stats.failures > 0 ? 1 : 0;
};

// TODO(wittjosiah): Include duration based on speed, also retries.
const logSuites = ({ suites, tests }: Suites, depth = 1, errors: TestResult[] = []) => {
  tests?.forEach((test) => {
    if (test.status === 'failed') {
      errors.push(test);
    }
    console.log(indent(depth), status(test.status!, errors.length), test.title);
  });

  suites &&
    Object.entries(suites).forEach(([name, suite]) => {
      console.log('\n', indent(depth), name);
      logSuites(suite, depth + 1, errors);
    });
};

const indent = (count: number) => {
  return Array(count).join('  ');
};

const status = (value: TestStatus, errorCount: number) => {
  switch (value) {
    case 'passed':
      return '✓';

    case 'failed':
      return `${errorCount})`;

    case 'pending':
      return '-';
  }
};

const buildXmlReport = ({ suites, stats }: RunTestsResults, options: OutputResultsOptions) => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true
  });

  const output = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    testsuites: {
      testsuite: buildXmlTestSuites(suites, suites.errors, stats),
      '@_name': `${options.name} ${options.browserType} Tests`,
      '@_time': stats.duration ? stats.duration / 1000 : null,
      '@_tests': stats.tests,
      '@_failures': stats.failures,
      '@_skipped': stats.pending
    }
  };

  return builder.build(output);
};

const buildXmlTestSuites = (suite: Suites, errors: TestError[], stats: Stats, name = 'Root Suite'): object => {
  const tests = suite.tests ? suite.tests.filter((test) => test.status !== 'pending') : [];

  return [
    {
      '@_name': name,
      '@_timestamp': stats.start,
      '@_tests': tests.length,
      '@_time': tests.reduce((time, test) => (test.duration ? time + test.duration : time), 0) / 1000,
      '@_failures': tests.reduce((count, test) => (test.status === 'failed' ? count + 1 : count), 0),
      testcase: tests.map((test) => {
        const error = errors.find((error) => [...error.suite, error.test].join(' ') === test.fullTitle);

        return {
          '@_name': test.fullTitle,
          '@_classname': test.title,
          '@_time': test.duration ? test.duration / 1000 : 0,
          ...(error
            ? {
                failure: {
                  '#text': error.stack,
                  '@_message': error.message
                }
              }
            : {})
        };
      })
    },
    ...(suite.suites
      ? Object.entries(suite.suites).map(([name, suite]) => buildXmlTestSuites(suite, errors, stats, name))
      : [])
  ].flat();
};
