//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage, insertNewlineContinueMarkup } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { createBasicExtensions } from './factories';

describe('createBasicExtensions readOnly', () => {
  test('drops user-initiated edits when readOnly is true', ({ expect }) => {
    const state = EditorState.create({
      doc: 'hello',
      extensions: [createBasicExtensions({ readOnly: true })],
    });
    const tr = state.update({
      changes: { from: state.doc.length, insert: ' world' },
      userEvent: 'input.type',
    });
    expect(tr.state.doc.toString()).toBe('hello');
  });

  for (const userEvent of ['delete.forward', 'undo', 'redo']) {
    test(`drops '${userEvent}' user events when readOnly is true`, ({ expect }) => {
      const state = EditorState.create({
        doc: 'hello',
        extensions: [createBasicExtensions({ readOnly: true })],
      });
      const tr = state.update({
        changes: { from: state.doc.length, insert: ' world' },
        userEvent,
      });
      expect(tr.state.doc.toString()).toBe('hello');
    });
  }

  test('allows programmatic dispatches (no userEvent) when readOnly is true', ({ expect }) => {
    // Streaming consumers (e.g. MarkdownStream) populate the doc programmatically — those
    // transactions must pass even though the editor is read-only to the user.
    const state = EditorState.create({
      doc: 'hello',
      extensions: [createBasicExtensions({ readOnly: true })],
    });
    const tr = state.update({ changes: { from: state.doc.length, insert: ' world' } });
    expect(tr.state.doc.toString()).toBe('hello world');
  });

  test('selection-only transactions still apply when readOnly', ({ expect }) => {
    const state = EditorState.create({
      doc: 'hello',
      extensions: [createBasicExtensions({ readOnly: true })],
    });
    const tr = state.update({ selection: EditorSelection.cursor(2) });
    expect(tr.state.selection.main.head).toBe(2);
  });

  test('doc-changing transactions apply normally when readOnly is false', ({ expect }) => {
    const state = EditorState.create({
      doc: 'hello',
      extensions: [createBasicExtensions({ readOnly: false })],
    });
    const tr = state.update({ changes: { from: state.doc.length, insert: ' world' } });
    expect(tr.state.doc.toString()).toBe('hello world');
  });

  // Regression: in MarkdownStream `readOnly: true` must also block the markdown extension's
  // Enter handler (`insertNewlineContinueMarkup`), which programmatically dispatches a list
  // continuation regardless of the readOnly facet.
  test('markdown insertNewlineContinueMarkup is suppressed when readOnly', ({ expect }) => {
    const doc = '- one\n- two';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: [createBasicExtensions({ readOnly: true }), markdown({ base: markdownLanguage })],
    });
    let dispatched: any;
    insertNewlineContinueMarkup({
      state,
      dispatch: (tr) => {
        dispatched = tr;
      },
    });
    if (dispatched) {
      expect(dispatched.state.doc.toString()).toBe(doc);
    }
  });
});
