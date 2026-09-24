//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React, { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';

import { Cursor } from '../../../util/index.ts';
import { automerge } from './automerge.ts';

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

  describe('typing bursts', () => {
    const IDLE_MS = 300;
    const MAX_DELAY_MS = 1_000;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const setup = async (initial = '') => {
      const obj = Obj.make(TestType, { text: initial });
      const accessor = Doc.createAccessor(obj, ['text']);
      const view = new EditorView({
        state: EditorState.create({
          doc: initial,
          extensions: [automerge(accessor, { idleMs: IDLE_MS, maxDelayMs: MAX_DELAY_MS })],
        }),
        parent: document.body,
      });
      // Let the mount-time reconcile run.
      await Promise.resolve();
      const type = (text: string) =>
        view.dispatch({ changes: { from: view.state.doc.length, insert: text }, userEvent: 'input.type' });
      const stored = () => Doc.getValue<string>(accessor);
      const changes = () => A.getAllChanges(accessor.handle.doc()).length;
      return { accessor, view, type, stored, changes };
    };

    test('a burst is written as one change once typing pauses', async ({ expect, onTestFinished }) => {
      const { view, type, stored, changes } = await setup();
      onTestFinished(() => view.destroy());
      const before = changes();

      for (const char of 'hello') {
        type(char);
        vi.advanceTimersByTime(IDLE_MS / 2);
      }
      expect(stored()).toBe('');

      vi.advanceTimersByTime(IDLE_MS);
      expect(stored()).toBe('hello');
      expect(changes() - before).toBe(1);
    });

    test('a long burst is written by the maximum delay', async ({ expect, onTestFinished }) => {
      const { view, type, stored } = await setup();
      onTestFinished(() => view.destroy());

      let typed = '';
      for (let elapsed = 0; elapsed <= MAX_DELAY_MS; elapsed += IDLE_MS / 2) {
        type('x');
        typed += 'x';
        vi.advanceTimersByTime(IDLE_MS / 2);
      }
      expect(stored()?.length).toBeGreaterThan(0);
      expect(typed.startsWith(stored() ?? '')).toBe(true);
    });

    test('a remote edit during a burst keeps both edits once', async ({ expect, onTestFinished }) => {
      const { accessor, view, type, stored } = await setup('abc');
      onTestFinished(() => view.destroy());

      type('def');
      accessor.handle.change((doc) => {
        A.splice(doc, [...accessor.path], 0, 0, '>');
      });
      // The editor reconciles once the writer's change has closed.
      await Promise.resolve();

      expect(view.state.doc.toString()).toBe('>abcdef');
      expect(stored()).toBe('>abcdef');
      vi.advanceTimersByTime(MAX_DELAY_MS);
      expect(stored()).toBe('>abcdef');
    });

    test('a cursor taken during a burst resolves to the typed position', async ({ expect, onTestFinished }) => {
      const { view, type, stored } = await setup('abc');
      onTestFinished(() => view.destroy());

      type('def');
      const converter = view.state.facet(Cursor.converter);
      const cursor = converter.toCursor(5);
      expect(stored()).toBe('abcdef');
      expect(converter.fromCursor(cursor)).toBe(5);

      // The deferred commit lands without writing the burst a second time.
      vi.advanceTimersByTime(MAX_DELAY_MS);
      expect(stored()).toBe('abcdef');
      expect(view.state.doc.toString()).toBe('abcdef');
    });

    test('reconfiguring the binding away writes the pending burst', async ({ expect, onTestFinished }) => {
      const obj = Obj.make(TestType, { text: '' });
      const accessor = Doc.createAccessor(obj, ['text']);
      const binding = new Compartment();
      const view = new EditorView({
        state: EditorState.create({
          extensions: [binding.of(automerge(accessor, { idleMs: IDLE_MS, maxDelayMs: MAX_DELAY_MS }))],
        }),
        parent: document.body,
      });
      onTestFinished(() => view.destroy());
      await Promise.resolve();

      view.dispatch({ changes: { from: 0, insert: 'kept' } });
      view.dispatch({ effects: binding.reconfigure([]) });
      expect(Doc.getValue<string>(accessor)).toBe('kept');
    });

    test('a binding reconfigured away before its mount reconcile runs does nothing', async ({
      expect,
      onTestFinished,
    }) => {
      const obj = Obj.make(TestType, { text: 'stored' });
      const accessor = Doc.createAccessor(obj, ['text']);
      const binding = new Compartment();
      const view = new EditorView({
        state: EditorState.create({ doc: 'other', extensions: [binding.of(automerge(accessor))] }),
        parent: document.body,
      });
      onTestFinished(() => view.destroy());
      view.dispatch({ effects: binding.reconfigure([]) });
      await Promise.resolve();
      expect(view.state.doc.toString()).toBe('other');
    });

    test('unmounting writes the pending burst', async ({ expect }) => {
      const { view, type, stored } = await setup();
      type('bye');
      view.destroy();
      expect(stored()).toBe('bye');
    });
  });
});
