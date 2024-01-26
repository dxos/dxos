//
// Copyright 2024 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { expect } from 'chai';

import { type AutomergeTextCompat, getRawDoc, TextObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { automerge } from './automerge';

describe('Automerge', () => {
  test('create', () => {
    const text = new TextObject('hello world!');
    const obj = text as any as AutomergeTextCompat;
    const doc = getRawDoc(obj, [obj.field]);
    const extension = automerge({ handle: doc.handle, path: doc.path });
    expect(extension).to.exist;

    const state = EditorState.create({ doc: text.text, extensions: [extension] });
  });
});
