//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { afterTest, describe, test } from '@dxos/test';

import { AutomergeObject } from './automerge-object';
import { Expando, TypedObject, base, setGlobalAutomergePreference } from '../object';
import { Contact, Task } from '../tests/proto';

describe('AutomergeObject', () => {
  test('objects become automerge objects when global flag is set', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Expando({});
    expect(obj[base] instanceof AutomergeObject).to.eq(true);
    expect(obj instanceof AutomergeObject).to.eq(true);
  });

  test('are instance of TypedObject', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Task({});
    expect(obj instanceof TypedObject).to.eq(true);
    expect(obj instanceof AutomergeObject).to.eq(true);
    expect(obj instanceof Task).to.eq(true);
    expect(obj instanceof Contact).to.eq(false);
  });
});
