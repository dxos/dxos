//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type AutomergeTextCompat, getRawDoc, TextObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { automerge } from './automerge';

describe('Automerge', () => {
  test('create', () => {
    const text = new TextObject('hello');
    const obj = text as any as AutomergeTextCompat;
    const doc = getRawDoc(obj, [obj.field]);
    const extension = automerge({ handle: doc.handle, path: doc.path });
    expect(extension).to.exist;
  });
});
