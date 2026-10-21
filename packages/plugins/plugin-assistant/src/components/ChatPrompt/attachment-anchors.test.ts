//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorState, type Extension, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, onTestFinished, test } from 'vitest';

import { attachmentAnchors, dropAnchor, insertAtAnchor, placeAnchor } from './attachment-anchors.ts';

describe('attachment anchors', () => {
  const editor = (doc: string, head = doc.length, extensions: Extension[] = []) => {
    const view = new EditorView({
      state: EditorState.create({ doc, selection: { anchor: head }, extensions: [attachmentAnchors(), ...extensions] }),
    });
    onTestFinished(() => view.destroy());
    return view;
  };
  const type = (view: EditorView, text: string) => {
    const head = view.state.selection.main.head;
    view.dispatch({
      changes: { from: head, insert: text },
      selection: { anchor: head + text.length },
      userEvent: 'input.type',
    });
  };

  test('a link lands where its file was attached, ahead of what was typed since', ({ expect }) => {
    const view = editor('Summarise ');
    placeAnchor(view, 0);
    type(view, 'and compare it');
    expect(insertAtAnchor(view, 0, '[agenda](echo:a) ')).toBe(true);
    expect(view.state.doc.toString()).toBe('Summarise [agenda](echo:a) and compare it');
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  test('a link is set apart from the word before it', ({ expect }) => {
    const view = editor('Summarise');
    placeAnchor(view, 0);
    insertAtAnchor(view, 0, '[agenda](echo:a) ');
    expect(view.state.doc.toString()).toBe('Summarise [agenda](echo:a) ');
  });

  test('links keep the order their files were attached in', ({ expect }) => {
    const view = editor('See ');
    placeAnchor(view, 0);
    placeAnchor(view, 1);
    placeAnchor(view, 2);
    insertAtAnchor(view, 2, '[c](echo:c) ');
    insertAtAnchor(view, 0, '[a](echo:a) ');
    insertAtAnchor(view, 1, '[b](echo:b) ');
    expect(view.state.doc.toString()).toBe('See [a](echo:a) [b](echo:b) [c](echo:c) ');
  });

  test('the link is kept out of the undo history', ({ expect }) => {
    const recorded: (boolean | undefined)[] = [];
    const view = editor('Summarise ', undefined, [
      EditorView.updateListener.of((update) => {
        for (const tr of update.transactions) {
          if (tr.docChanged) {
            recorded.push(tr.annotation(Transaction.addToHistory));
          }
        }
      }),
    ]);
    placeAnchor(view, 0);
    type(view, 'and compare it');
    insertAtAnchor(view, 0, '[agenda](echo:a) ');
    expect(recorded).toEqual([undefined, false]);
  });

  test('a selection ending at the anchor is kept', ({ expect }) => {
    const view = editor('hello world', 11);
    placeAnchor(view, 0);
    view.dispatch({ selection: { anchor: 6, head: 11 } });
    insertAtAnchor(view, 0, '[a](echo:a) ');
    const { from, to } = view.state.selection.main;
    expect(view.state.sliceDoc(from, to)).toBe('world');
  });

  test('a link between words takes one space either side', ({ expect }) => {
    const view = editor('foo bar', 3);
    placeAnchor(view, 0);
    insertAtAnchor(view, 0, '[a](echo:a) ');
    expect(view.state.doc.toString()).toBe('foo [a](echo:a) bar');
  });

  test('a dropped anchor takes no link', ({ expect }) => {
    const view = editor('See ');
    placeAnchor(view, 0);
    dropAnchor(view, 0);
    expect(insertAtAnchor(view, 0, '[a](echo:a) ')).toBe(false);
    expect(view.state.doc.toString()).toBe('See ');
  });
});
