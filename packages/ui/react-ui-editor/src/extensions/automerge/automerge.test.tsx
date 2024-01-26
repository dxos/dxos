//
// Copyright 2024 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import get from 'lodash.get';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { describe, test } from 'vitest';

import { type DocHandle, Repo } from '@dxos/automerge/automerge-repo';

import { automerge } from './automerge';

type TestObject = {
  text: string;
};

const path = ['text'];

const createObject = (repo: Repo, content: string): DocHandle<TestObject> => {
  const handle = repo.create<TestObject>();
  handle.change((doc: TestObject) => {
    doc.text = content;
  });

  return handle;
};

const Test: FC<{ handle: DocHandle<TestObject> }> = ({ handle }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView>();
  useEffect(() => {
    const state = EditorState.create({ doc: get(handle.docSync()!, path), extensions: [automerge({ handle, path })] });
    const view = new EditorView({ state, parent: ref.current! });
    setView(view);
  }, []);

  useEffect(() => {
    if (view) {
      view.dispatch({ changes: { from: view.state.doc.length - 1, insert: ' world' } });
    }
  }, [view]);

  return <div ref={ref}></div>;
};

chai.use(chaiDom);

describe('Automerge', () => {
  test('EditorView', () => {
    const repo = new Repo({ network: [] });
    const handle = createObject(repo, 'hello!');
    render(<Test handle={handle} />);
    expect(screen.getByRole('textbox')).to.have.text('hello world!');
    expect(handle.docSync()!.text).to.equal('hello world!');
  });
});
