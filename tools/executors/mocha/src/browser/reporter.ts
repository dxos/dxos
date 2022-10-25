//
// Copyright 2022 DXOS.org
//

import type { Runner, Test } from 'mocha';

export type TestStatus = 'passed' | 'failed' | 'pending';

export type TestResult = {
  suite: string[];
  title: string;
  fullTitle: string;
  status: TestStatus;
  duration?: number;
  speed?: Test['speed'];
  currentRetry: number;
};

export class BrowserReporter {
  private readonly _currentSuite: string[] = [];
  private readonly _retries = new Map<string, number>();

  constructor(runner: Runner) {
    const stats = runner.stats!;

    runner
      // TODO(wittjosiah): Runner.constants is not available when compiled for browser.
      .on('suite', (suite) => {
        // Ignore the root suite.
        if (suite.title) {
          this._currentSuite.push(suite.title);
        }
      })
      .on('suite end', (suite) => {
        // Ignore the root suite.
        if (suite.title) {
          this._currentSuite.pop();
        }
      })
      .on('fail', (test, error) => {
        console.log(
          JSON.stringify({
            event: 'fail',
            suite: this._currentSuite,
            test: test.title,
            message: error.message,
            stack: error.stack
          })
        );
      })
      .on('test end', (test) => {
        console.log(
          JSON.stringify({
            event: 'test end',
            test: this.getResult(test)
          })
        );
      })
      .once('end', () => {
        console.log(
          JSON.stringify({
            event: 'end',
            stats
          })
        );
      });
  }

  getRetry(key: string) {
    const currentRetry = this._retries.get(key) ?? 0;
    this._retries.set(key, currentRetry + 1);

    return currentRetry;
  }

  getResult(test: Test): TestResult {
    const fullTitle = test.fullTitle();

    return {
      suite: this._currentSuite,
      title: test.title,
      fullTitle,
      status: test.isPassed() ? 'passed' : test.isFailed() ? 'failed' : 'pending',
      duration: test.duration,
      speed: test.speed,
      currentRetry: this.getRetry(fullTitle)
    };
  }
}
