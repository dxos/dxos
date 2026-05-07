//
// Copyright 2024 DXOS.org
//

import { type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@automerge/automerge';
import { type DocHandle, Repo, decodeHeads, encodeHeads } from '@automerge/automerge-repo';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { describe, test } from 'vitest';

import { type IDocHandle } from '@dxos/echo-db';
import { getDeep } from '@dxos/util';

import { automerge } from './automerge';

// Adapter: `IDocHandle` (used by `DocHandleProxy` in production) takes raw `Heads` (hex)
// at `changeAt`, but automerge-repo's `DocHandle.changeAt` expects bs58check-encoded
// `UrlHeads`. Encode on the way in, decode on the way out so the test's repo-backed
// handle satisfies the extension's `IDocHandle` contract.
const adaptRepoHandle = <T,>(handle: DocHandle<T>): IDocHandle<T> => ({
  doc: () => handle.doc() as Doc<T> | undefined,
  change: (callback: ChangeFn<T>, options?: ChangeOptions<T>) =>
    options ? handle.change(callback, options) : handle.change(callback),
  changeAt: (heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined => {
    const encoded = options
      ? handle.changeAt(encodeHeads(heads), callback, options)
      : handle.changeAt(encodeHeads(heads), callback);
    return encoded ? decodeHeads(encoded) : undefined;
  },
  addListener: (event, listener) => handle.on(event, listener),
  removeListener: (event, listener) => handle.off(event, listener),
});

const path = ['text'];

type TestObject = {
  text: string;
};

class Generator {
  constructor(private readonly _handle: DocHandle<TestObject>) {}
  update(text: string): void {
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
      automerge({ handle: adaptRepoHandle(handle), path }),
      EditorView.updateListener.of((update) => {
        if (view.state.doc.toString() === 'hello!') {
          // Update editor.
          update.view.dispatch({
            changes: { from: view.state.doc.length - 1, insert: ' world' },
          });
        }
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: getDeep(handle.doc()!, path), extensions }),
      parent: ref.current!,
    });

    setView(view);
  }, []);

  useEffect(() => {}, [view]);

  return <div ref={ref} data-testid='editor' />;
};

// TODO(burdon): Test history/undo.
// TODO(burdon): https://testing-library.com/docs/react-testing-library/example-intro/

describe('Automerge', () => {
  test('basic sync', ({ expect }) => {
    const repo = new Repo({ network: [] });
    const handle = repo.create<TestObject>();
    const generator = new Generator(handle);
    render(<Test handle={handle} generator={generator} />);

    const editor = screen.getByTestId('editor');
    expect(editor.textContent).toBe('');

    generator.update('hello!');
    expect(editor.textContent).toBe('hello world!');
  });
});
