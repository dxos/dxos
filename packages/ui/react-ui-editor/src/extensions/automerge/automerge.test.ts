//
// Copyright 2024 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { expect } from 'chai';
import get from 'lodash.get';

import { type DocHandle, Repo } from '@dxos/automerge/automerge-repo';
import { describe, test } from '@dxos/test';

import { automerge } from './automerge';

type TestObject = {
  text: string;
};

const path = ['text'];

const createState = (content: string): [EditorState, DocHandle<TestObject>, Extension] => {
  const repo = new Repo({ network: [] });
  const handle = repo.create<TestObject>();
  handle.change((doc: TestObject) => {
    doc.text = content;
  });
  const extension = automerge({ handle, path });
  const state = EditorState.create({ doc: get(handle.docSync()!, path), extensions: [extension] });
  return [state, handle, extension];
};

describe('Automerge', () => {
  test('create', async () => {
    const content = 'hello world!';
    const [state, handle] = createState(content);
    expect(state.doc.toString()).to.eq(content);
    expect(handle.docSync()?.text).to.eq(content);
  });

  test('CodeMirror update', () => {
    const content = 'hello!';
    const [state] = createState(content);
    const {
      state: { doc },
    } = state.update({
      changes: {
        from: 5,
        insert: ' world',
      },
    });

    expect(doc.toString()).to.eq('hello world!');
  });

  // TODO(burdon): vitest.
  // const view = new EditorView({ state });
  // test('', () => {});
});
