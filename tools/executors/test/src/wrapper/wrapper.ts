//
// Copyright 2022 DXOS.org
//

import { AsyncFunc, Func, HookFunction, TestFunction as NaturalTestFunction, SuiteFunction } from 'mocha';

import { TestEnvironment } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mocha = require('mocha/lib/mocha');

class TestBuilder {
  private _timeout?: number;
  private _retries?: number;
  private _tags: string[] = ['unit'];
  private _environments: {
    include?: TestEnvironment[];
    exclude?: TestEnvironment[];
  } = {};

  constructor(public readonly body: Func | AsyncFunc) {}

  get info() {
    return {
      timeout: this._timeout,
      retries: this._retries,
      tags: this._tags,
      environments: this._environments,
    };
  }

  timeout(length: number) {
    this._timeout = length;
    return this;
  }

  retries(count: number) {
    this._retries = count;
    return this;
  }

  tag(...tags: string[]) {
    this._tags = tags;
    return this;
  }

  onlyEnvironments(...environments: TestEnvironment[]) {
    this._environments.include = environments;
    return this;
  }

  skipEnvironments(...environments: TestEnvironment[]) {
    this._environments.exclude = environments;
    return this;
  }
}

interface TestFunction {
  (name: string, body: Func | AsyncFunc): Test;
  only: TestFunction;
  skip: TestFunction;

  /**
   * Run test multiple times. Useful for debugging flaky tests.
   */
  repeat(count: number): TestFunction;
}

interface Test {
  timeout(length: number): Test;
  retries(count: number): Test;
  // TODO(wittjosiah): Support on describe as well.
  tag(...tags: string[]): Test;
  onlyEnvironments(...environments: string[]): Test;
  skipEnvironments(...environments: string[]): Test;
}

type TestParams = {
  repeat?: number;
};

const testBase =
  (mochaFn: NaturalTestFunction, params: TestParams = {}) =>
  (name: string, body: Func | AsyncFunc) => {
    const builder = new TestBuilder(body);

    if (params.repeat) {
      describe(`${name} [${params.repeat} times]`, () => {
        for (let i = 0; i < params.repeat!; i += 1) {
          defineTest(`${name} [${i + 1}/${params.repeat}]`);
        }
      });
    } else {
      defineTest(name);
    }

    function defineTest(name: string) {
      (mochaFn as NaturalTestFunction)(name, async function (...args) {
        const { timeout, retries, tags, environments } = builder.info;

        if (timeout) {
          this.timeout(timeout);
        }

        if (retries) {
          this.retries(retries);
        }

        const skip =
          tags.filter((tag) => mochaExecutor.tags.includes(tag)).length === 0 ||
          (environments.include && !environments.include.includes(mochaExecutor.environment)) ||
          (environments.exclude && environments.exclude.includes(mochaExecutor.environment));
        if (skip) {
          this.skip();
        }

        await builder.body.bind(this)(...args);
      });
    }

    return builder;
  };

const testWrapper = testBase(mocha.it) as any;
testWrapper.only = testBase(mocha.it.only);
testWrapper.skip = testBase(mocha.it.skip);
testWrapper.repeat = (count: number) => testBase(mocha.it.only, { repeat: count });

export const test: TestFunction = testWrapper;
export const describe: SuiteFunction = mocha.describe;
export const afterAll: HookFunction = mocha.after;
export const afterEach: HookFunction = mocha.afterEach;
export const beforeAll: HookFunction = mocha.before;
export const beforeEach: HookFunction = mocha.beforeEach;
