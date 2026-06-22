//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React, { useEffect, useRef } from 'react';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';

import { automerge } from './automerge';

const TestType = Schema.Struct({ text: Schema.String }).pipe(
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
      EditorView.updateListener.of(() => {
        if (view.state.doc.toString() === 'hello!') {
          // Update editor.
          view.dispatch({
            changes: { from: view.state.doc.length - 1, insert: ' world' },
          });
        }
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: Doc.Accessor.getValue<string>(accessor) ?? '', extensions }),
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
});
