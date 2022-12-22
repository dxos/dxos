//
// Copyright 2022 DXOS.org
//

import { describe, test } from '@dxos/test';

import { log } from './log';
import { logInfo, setLogParent } from './scope';

describe('Scope capture', function () {
  test('field instance', function () {
    class Container {
      constructor(private readonly _id: string) {}

      @logInfo
      get id() {
        return this._id;
      }

      run() {
        log('run');
      }
    }

    const foo = new Container('foo');
    const bar = new Container('bar');

    foo.run();
    bar.run();
  });

  test('field instance', function () {
    class Parent {
      constructor(
        private readonly _id: string,
        public child: Child
      ) {
        setLogParent(this, child)
      }

      @logInfo
      get id() {
        return this._id;
      }
    }

    class Child {
      constructor(private readonly _id: string) {}

      @logInfo
      get id() {
        return this._id;
      }

      run() {
        log('run');
      }
    }


    const parent1 = new Parent('parent1', new Child('child1'));
    parent1.child.run();
  });
});
