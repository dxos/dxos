//
// Copyright 2026 DXOS.org
//

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { beforeEach, describe, expect, test } from 'vitest';

import { Message } from '@dxos/types';

import { ChunkModel, EditorChunkDocument } from '../model';
import { type MessageLike } from '../types';
import {
  type MessageDocumentOptions,
  messageDocumentChrome,
  setMessageDocumentStateEffect,
} from './message-document-extension';
import { buildMessageDocumentItems, renderMessageDocumentItem } from './message-document-items';

const alice = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };

const message = (text: string, offset: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T09:00:00.000Z') + offset).toISOString(),
    sender: alice,
    blocks: [{ _tag: 'text', text }],
  });

describe('in-place editing', () => {
  let view: EditorView;
  let model: ChunkModel<any>;
  let messages: Message.Message[];
  let drafts: string[];
  let committed: string[];
  let cancelled: number;

  const setEditing = (id?: string) => {
    view.dispatch({ effects: setMessageDocumentStateEffect.of({ editingId: id }) });
  };

  /** Rebuild the items the way the component does, so the draft reaches the rendered text. */
  const sync = (draft?: { id: string; text: string }) => {
    model.set(buildMessageDocumentItems(messages, { dayDivider: false, draft }));
    model.sync(new EditorChunkDocument(view));
  };

  /** A change the user could have made, as opposed to one the model wrote. */
  const type = (pos: number, text: string) => {
    view.dispatch({ changes: { from: pos, insert: text }, userEvent: 'input.type' });
  };

  beforeEach(() => {
    messages = [message('first', 0), message('second', 10 * 60_000)];
    drafts = [];
    committed = [];
    cancelled = 0;
    model = new ChunkModel(renderMessageDocumentItem);
    const options: MessageDocumentOptions = {
      model,
      getMetadata: (message: MessageLike) => ({ authorName: message.sender.name }),
      onDraftChange: (_message, text) => drafts.push(text),
      onEditCommit: (_message, text) => committed.push(text),
      onEditCancel: () => cancelled++,
    };
    view = new EditorView({ extensions: [messageDocumentChrome(options)] });
    sync();
  });

  test('the document renders the message bodies', () => {
    expect(view.state.doc.toString()).toBe('first\nsecond\n');
  });

  test('no message is editable until one is being edited', () => {
    expect(view.contentDOM.getAttribute('contenteditable')).not.toBe('true');
    type(0, 'X');
    expect(view.state.doc.toString()).toBe('first\nsecond\n');
  });

  test('editing makes the view editable', () => {
    setEditing(messages[0].id);
    expect(view.contentDOM.getAttribute('contenteditable')).toBe('true');
  });

  test('appending at the end of the edited message is allowed', () => {
    setEditing(messages[0].id);
    // The end of the row, which a range-suppressing change filter would reject as out of bounds —
    // and appending is the most ordinary edit there is.
    type(5, ' more');
    expect(view.state.doc.toString()).toBe('first more\nsecond\n');
    expect(drafts.at(-1)).toBe('first more');
  });

  test('inserting at the start of the edited message is allowed', () => {
    setEditing(messages[0].id);
    type(0, 'the ');
    expect(view.state.doc.toString()).toBe('the first\nsecond\n');
  });

  test('a change to another message is rejected', () => {
    setEditing(messages[0].id);
    type(6, 'X');
    expect(view.state.doc.toString()).toBe('first\nsecond\n');
  });

  test('deleting the separator is rejected, so two messages cannot be merged', () => {
    setEditing(messages[0].id);
    view.dispatch({ changes: { from: 5, to: 6 }, userEvent: 'delete.forward' });
    expect(view.state.doc.toString()).toBe('first\nsecond\n');
  });

  test('the model keeps writing while a message is edited', () => {
    setEditing(messages[0].id);
    type(5, ' more');

    // A peer's message arrives mid-edit: it lands, and the draft survives it — which is what
    // suspending the sync outright would have cost.
    messages = [...messages, message('third', 20 * 60_000)];
    sync({ id: messages[0].id, text: 'first more' });
    expect(view.state.doc.toString()).toBe('first more\nsecond\nthird\n');
  });

  test("a peer's revision of the edited message loses to the draft", () => {
    setEditing(messages[0].id);
    type(5, ' more');

    messages = [Message.make({ ...messages[0], blocks: [{ _tag: 'text', text: 'clobbered' }] }), messages[1]];
    sync({ id: messages[0].id, text: 'first more' });
    expect(view.state.doc.toString()).toBe('first more\nsecond\n');
  });

  test('committing reports the edited text', () => {
    setEditing(messages[0].id);
    type(5, ' more');
    expect(runKey(view, 'Enter')).toBe(true);
    expect(committed).toEqual(['first more']);
  });

  test('escape cancels without committing', () => {
    setEditing(messages[0].id);
    type(5, ' more');
    expect(runKey(view, 'Escape')).toBe(true);
    expect(committed).toEqual([]);
    expect(cancelled).toBe(1);
  });
});

/** Dispatch a keydown the keymap will see, and report whether a binding claimed it. */
const runKey = (view: EditorView, key: string): boolean => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
};
