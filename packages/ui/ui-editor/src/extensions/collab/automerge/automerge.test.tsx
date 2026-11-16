//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React, { useEffect, useRef } from 'react';
import { describe, onTestFinished, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';

import { automerge } from './automerge.ts';

const TestType = Schema.Struct({ text: Schema.String, note: Schema.optional(Schema.String) }).pipe(
  Type.makeObject(DXN.make('com.example.test.editor', '0.1.0')),
);
type TestType = Type.InstanceType<typeof TestType>;

class Generator {
  constructor(private readonly _accessor: Doc.Accessor<TestType>) {}

  update(text: string): void {
    this._accessor.handle.change((doc) => {
      A.splice(doc, [...this._accessor.path], 0, 0, text);
    });
  }
}

const Test = ({ accessor }: { accessor: Doc.Accessor<TestType> }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const extensions = [
      automerge(accessor),
      EditorView.updateListener.of((update) => {
        if (update.view.state.doc.toString() === 'hello!') {
          // Update editor.
          update.view.dispatch({
            changes: { from: update.view.state.doc.length - 1, insert: ' world' },
          });
        }
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: Doc.getValue<string>(accessor) ?? '', extensions }),
      parent: ref.current!,
    });

    return () => view.destroy();
  }, [accessor]);

  return <div ref={ref} data-testid='editor' />;
};

// TODO(burdon): Test history/undo.

describe('Automerge', () => {
  test('basic sync', ({ expect }) => {
    const obj = Obj.make(TestType, { text: '' });
    const accessor = Doc.createAccessor(obj, ['text']);
    const generator = new Generator(accessor);
    render(<Test accessor={accessor} />);

    const editor = screen.getByTestId('editor');
    expect(editor.textContent).toBe('');

    generator.update('hello!');
    expect(editor.textContent).toBe('hello world!');
  });

  test('an unset string is created by the first local edit, not by attaching', async ({ expect }) => {
    const obj = Obj.make(TestType, { text: '' });
    const view = new EditorView({
      state: EditorState.create({ doc: '', extensions: [automerge(Doc.createAccessor(obj, ['note']))] }),
    });
    await Promise.resolve();
    expect(view.state.doc.toString()).toBe('');
    expect(obj.note).toBeUndefined();
    view.dispatch({ changes: { from: 0, insert: 'hi' } });
    expect(obj.note).toBe('hi');
    view.destroy();
  });

  test('edits from the document are marked remote', ({ expect }) => {
    const { accessor, view, remote } = createRecordedView(Obj.make(TestType, { text: '' }));
    new Generator(accessor).update('hello');
    view.dispatch({ changes: { from: 5, insert: '!' } });
    expect(remote).toEqual([true, true, false]);
  });

  test('the attach-time sync is marked remote', async ({ expect }) => {
    const { view, remote } = createRecordedView(Obj.make(TestType, { text: 'hello' }));
    await expect.poll(() => view.state.doc.toString()).toBe('hello');
    expect(remote).toEqual([true]);
  });
});

// Records whether each transaction awareness weighs as a move (a doc change or a selection) is marked remote.
const createRecordedView = (obj: TestType) => {
  const accessor = Doc.createAccessor(obj, ['text']);
  const remote: boolean[] = [];
  const view = new EditorView({
    state: EditorState.create({
      extensions: [
        automerge(accessor),
        EditorView.updateListener.of(({ transactions }) => {
          for (const tr of transactions.filter((tr) => tr.docChanged || tr.selection !== undefined)) {
            remote.push(!!tr.annotation(Transaction.remote));
          }
        }),
      ],
    }),
    parent: document.body,
  });
  onTestFinished(() => view.destroy());
  return { accessor, view, remote };
};
