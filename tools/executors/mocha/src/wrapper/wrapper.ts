//
// Copyright 2022 DXOS.org
//

import { AsyncFunc, Func, TestFunction as NaturalTestFunction } from 'mocha';

import { TestEnvironment } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mocha = require('mocha/lib/mocha');

class TestBuilder {
  private _tags: string[] = ['unit'];
  private _environments: TestEnvironment[] = [];

  constructor(public readonly name: string, public readonly body: Func | AsyncFunc) {}

  get tags() {
    return this._tags;
  }

  get environments() {
    return this._environments;
  }

  tag(...tags: string[]) {
    this._tags = tags;
    return this;
  }

  environment(...environments: TestEnvironment[]) {
    this._environments = environments;
    return this;
  }
}

interface TestFunction {
  (name: string, body: Func | AsyncFunc): Test;
  only: TestFunction;
  skip: TestFunction;
}

interface Test {
  tag(...tags: string[]): Test;
  environment(...environments: string[]): Test;
}

const testBase = (mochaFn: NaturalTestFunction) => (name: string, body: Func | AsyncFunc) => {
  const builder = new TestBuilder(name, body);

  (mochaFn as NaturalTestFunction)(builder.name, async function (...args) {
    const skip = builder.tags.filter((tag) => mochaExecutor.tags.includes(tag)).length === 0;
    if (skip) {
      this.skip();
    }

    await builder.body.bind(this)(...args);
  });

  return builder;
};

const testWrapper = testBase(mocha.it) as any;
testWrapper.only = testBase(mocha.it.only);
testWrapper.skip = testBase(mocha.it.skip);

export const test: TestFunction = testWrapper;
export const describe = mocha.describe;
