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

class Generator {
  constructor(private readonly _handle: DocHandle<TestObject>) {}
  update(text: string) {
    this._handle.change((doc: TestObject) => {
      doc.text = text;
    });
  }
}

const Test: FC<{ handle: DocHandle<TestObject>; generator: Generator }> = ({ handle, generator }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView>();
  useEffect(() => {
    const extensions = [
      automerge({ handle, path }),
      EditorView.updateListener.of((update) => {
        if (view.state.doc.toString() === 'hello!') {
          // Update editor.
          update.view.dispatch({ changes: { from: view.state.doc.length - 1, insert: ' world' } });
        }
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: get(handle.docSync()!, path), extensions }),
      parent: ref.current!,
    });

    setView(view);
  }, []);

  useEffect(() => {}, [view]);

  return <div ref={ref} />;
};

chai.use(chaiDom);

describe('Automerge', () => {
  test('basic sync', () => {
    const repo = new Repo({ network: [] });
    const handle = repo.create<TestObject>();
    const generator = new Generator(handle);
    render(<Test handle={handle} generator={generator} />);
    expect(screen.getByRole('textbox')).to.have.text('');

    generator.update('hello!');
    expect(screen.getByRole('textbox')).to.have.text('hello world!');
  });

  // TODO(burdon): Test history/undo.
  // TODO(burdon): https://testing-library.com/docs/react-testing-library/example-intro/
});
