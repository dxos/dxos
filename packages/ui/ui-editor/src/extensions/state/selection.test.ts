//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Schema from 'effect/Schema';
import { describe, onTestFinished, test } from 'vitest';

import {
  type EditorSelectionState,
  EditorSelectionStateSchema,
  documentId,
  restoreEditorState,
  selectionState,
} from './selection.ts';

const DOC_ID = 'doc';

/** Mounts a view whose recorder writes into `store`. */
const createRecordingView = (store: Map<string, EditorSelectionState>) => {
  const parent = document.createElement('div');
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: 'line one\nline two\nline three\n',
      extensions: [
        documentId.of(DOC_ID),
        selectionState({ getState: (id) => store.get(id), setState: (id, state) => store.set(id, state) }),
      ],
    }),
  });
  // happy-dom has no layout, so pin the top-of-viewport position the recorder measures.
  view.posAtCoords = () => 0;
  onTestFinished(() => {
    view.destroy();
    parent.remove();
  });
  return view;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('selectionState', () => {
  const restored: EditorSelectionState = { scrollTo: 12, scrollOffset: 3, selection: { anchor: 15, head: 15 } };

  test('records the caret after a change', async ({ expect }) => {
    const store = new Map<string, EditorSelectionState>();
    const view = createRecordingView(store);
    view.dispatch({ selection: { anchor: 4 } });
    await sleep(1_200);
    expect(store.get(DOC_ID)?.selection).toEqual({ anchor: 4, head: 4 });
  });

  // The content fill at mount records the top of the document; that write must not land over the
  // state the restore just applied, or the next visit opens at the top.
  test('a restore cancels a write queued before it', async ({ expect }) => {
    const store = new Map<string, EditorSelectionState>([[DOC_ID, restored]]);
    const view = createRecordingView(store);
    view.dispatch({ selection: { anchor: 2 } });
    await sleep(50);
    restoreEditorState(view, restored);
    await sleep(1_200);
    expect(store.get(DOC_ID)).toEqual(restored);
  });

  test('a measurement requested before a restore is not written after it', async ({ expect }) => {
    const store = new Map<string, EditorSelectionState>([[DOC_ID, restored]]);
    const view = createRecordingView(store);
    view.dispatch({ selection: { anchor: 2 } });
    restoreEditorState(view, restored);
    await sleep(1_200);
    expect(store.get(DOC_ID)).toEqual(restored);
  });
});

describe('EditorSelectionStateSchema', () => {
  test('encode/decode preserves the legacy serialized shape', ({ expect }) => {
    const value = { scrollTo: 42, selection: { anchor: 3, head: 9 } };
    const encoded = Schema.encodeSync(EditorSelectionStateSchema)(value);
    expect(encoded).toEqual(value);
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)(JSON.parse(JSON.stringify(encoded)))).toEqual(value);
  });

  test('accepts an empty state', ({ expect }) => {
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)({})).toEqual({});
  });

  test('accepts selection without head', ({ expect }) => {
    const value = { selection: { anchor: 5 } };
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)(value)).toEqual(value);
  });
});
