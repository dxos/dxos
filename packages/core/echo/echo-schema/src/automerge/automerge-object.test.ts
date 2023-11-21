//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { afterTest, describe, test } from '@dxos/test';

import { AutomergeObject } from './automerge-object';
import { Expando, base, setGlobalAutomergePreference } from '../object';

describe('AutomergeObject', () => {
  test('objects become automerge objects when global flag is set', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Expando({});
    console.log(obj[base]);
    expect(obj[base] instanceof AutomergeObject).to.eq(true);
    expect(obj instanceof AutomergeObject).to.eq(true);
  });
});
