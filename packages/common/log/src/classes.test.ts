//
// Copyright 2022 DXOS.org
//

import { log } from './log';
import { debugInfo, ownershipClass } from './ownership';

describe('classes', function () {
  it('field instance', function () {
    @ownershipClass
    class Inner {
      run() {
        log('Running');
      }
    }

    @ownershipClass
    class Outer {
      inner = new Inner();

      constructor(private readonly _id: string) {}

      @debugInfo
      get id() {
        return this._id;
      }

      run() {
        this.inner.run();
      }
    }

    const foo = new Outer('foo');
    const bar = new Outer('bar');

    foo.run();
    bar.run();
  });

  it('return values', async function () {
    @ownershipClass
    class Instance {
      run() {
        log('Running');
      }
    }

    @ownershipClass
    class Factory {
      inner = new Instance();

      constructor(private readonly _id: string) {}

      @debugInfo
      get id() {
        return this._id;
      }

      async create() {
        return new Instance();
      }
    }

    const foo = new Factory('foo');
    const bar = new Factory('bar');

    const fooInstance = await foo.create();
    const barInstance = await bar.create();
    fooInstance.run();
    barInstance.run();
  });
});
