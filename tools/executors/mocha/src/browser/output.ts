//
// Copyright 2022 DXOS.org
//

import { XMLBuilder } from 'fast-xml-parser';
import get from 'lodash.get';
import set from 'lodash.set';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserType } from './browser';

type Status = 'Passed' | 'Failed' | 'Pending'

type Suites = {
  [key: string]: Suites | Test[]
}

type Test = {
  title: string
  fullTitle: string
  file: string | null
  duration: number
  currentRetry: number
  speed: string
  err: any
  status?: Status
}

type Stats = {
  suites: number
  tests: number
  passes: number
  pending: number
  failures: number
  start: string
  end: string
  duration: number
}

type Results = {
  stats: Stats
  tests: Test[]
  pending: Test[]
  failures: Test[]
  passes: Test[]
}

export const outputResults = async (resultString: string, outDir: string, name: string, browserType: BrowserType) => {
  const results = JSON.parse(resultString) as Results;

  const suites = results.tests.reduce<Suites>((tests, test) => {
    const suiteSelector = test.fullTitle.slice(0, -(test.title.length + 1)).split(' ');
    const suite = get(tests, suiteSelector) ?? [];

    const passed = results.passes.findIndex(({ fullTitle }) => test.fullTitle === fullTitle) >= 0;
    const failed = results.failures.findIndex(({ fullTitle }) => test.fullTitle === fullTitle) >= 0;
    const status = passed ? 'Passed' : failed ? 'Failed' : 'Pending';

    return set(tests, suiteSelector, [...suite, { ...test, status }]);
  }, {});

  logSuites(suites);
  console.log('\n');

  if (results.stats.passes > 0) {
    console.log(indent(1), results.stats.passes, 'passing', `(${results.stats.duration}ms)`);
  }
  if (results.stats.pending > 0) {
    console.log(indent(1), results.stats.pending, 'pending');
  }
  if (results.stats.failures > 0) {
    console.log(indent(1), results.stats.failures, 'failing');

    results.failures.forEach((test, index) => {
      const suite = test.fullTitle.slice(0, -(test.title.length + 1));
      console.log('\n', indent(1), `${index + 1})`, suite);
      console.log(indent(3), `${test.title}:`);
      console.log(indent(2), test.err.message);
    });
  }

  const xml = buildXmlReport(suites, name, browserType, results.stats);
  await writeFile(join(outDir, `${browserType}.xml`), xml, 'utf-8');

  return results.stats.failures > 0 ? 1 : 0;
};

// TODO(wittjosiah): Color results to match nodejs spec output.
const logSuites = (suites: Suites, depth = 1, errors: Test[] = []) => {
  Object.entries(suites).forEach(([name, suite]) => {
    console.log('\n', indent(depth), name);
    if (Array.isArray(suite)) {
      suite.forEach(test => {
        if (test.status === 'Failed') {
          errors.push(test);
        }
        console.log(indent(depth + 1), status(test.status!, errors.length), test.title);
      });
    } else {
      logSuites(suite, depth + 1, errors);
    }
  });
};

const indent = (count: number) => {
  return Array(count).join('    ');
};

const status = (value: Status, errorCount: number) => {
  switch (value) {
    case 'Passed':
      return '✓';

    case 'Failed':
      return `${errorCount})`; // '✖';

    case 'Pending':
      return '-';
  }
};

const buildXmlReport = (suites: Suites, name: string, browserType: BrowserType, stats: Stats) => {
  const testsuite = Object.entries(suites).map(([name, suite]) => {
    if (Array.isArray(suite)) {
      return {
        '@_name': name,
        '@_timestamp': stats.start,
        '@_tests': suite.length,
        '@_time': suite.reduce((time, test) => test.duration ? time + test.duration : time, 0) / 1000,
        '@_failures': suite.reduce((count, test) => test.status === 'Failed' ? count + 1 : count, 0),
        testcase: suite.map(test => ({
          '@_name': test.fullTitle,
          '@_classname': test.title,
          '@_time': test.duration / 1000,
          ...(test.status === 'Failed' ? {
            failure: {
              '#text': test.err.stack,
              '@_message': test.err.message
            }
          } : {})
        }))
      };
    } else {
      return {
        '@_name': name,
        '@_timestamp': stats.start
      };
    }
  });

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
      testsuite,
      '@_name': `${name} ${browserType} Tests`,
      '@_time': stats.duration / 1000,
      '@_tests': stats.tests,
      '@_failures': stats.failures,
      '@_skipped': stats.pending
    }
  };

  return builder.build(output);
};
