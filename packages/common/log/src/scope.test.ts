//
// Copyright 2022 DXOS.org
//

import { describe, test } from '@dxos/test';

import { log } from './log';
import { logInfo } from './scope';

describe('Scope capture', function () {
  test('field instance', function () {
    class Container {
      constructor(private readonly _id: string) {}

      @logInfo
      get id() {
        return this._id;
      }

      run() {
        log.info('run');
      }
    }

    const foo = new Container('foo');
    const bar = new Container('bar');

    foo.run();
    bar.run();
  });
});
