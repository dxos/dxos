//
// Copyright 2026 DXOS.org
//

import { type Extension, type Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type ChunkModel } from '../model';
import { type MessageChunk } from './message-chunks';

/** A change the user made, as opposed to one the model wrote. */
const isUserEdit = (transaction: Transaction): boolean =>
  transaction.isUserEvent('input') ||
  transaction.isUserEvent('delete') ||
  transaction.isUserEvent('move') ||
  transaction.isUserEvent('undo') ||
  transaction.isUserEvent('redo');

export type EditableOptions = {
  model: ChunkModel<MessageChunk>;
  /** Every keystroke inside the body, so the host can hold the draft in memory. */
  onChange: (text: string) => void;
};

/**
 * Makes the body writable and reports what is typed into it.
 *
 * Held in a compartment by the caller so that entering edit mode reconfigures the view rather than
 * rebuilding it — a rebuilt view is a new document, which throws away the text the user came to
 * change along with their caret.
 */
export const editable = ({ model, onChange }: EditableOptions): Extension => [
  EditorView.editable.of(true),
  EditorView.updateListener.of((update) => {
    if (!update.docChanged || !update.transactions.some(isUserEdit)) {
      return;
    }

    // The model diffs against the text it last wrote, so a keystroke it did not make leaves it
    // believing something false about the document. Rebasing keeps the next sync — a peer's
    // revision of another block, say — from re-applying the user's own edit on top of itself.
    const text = update.state.doc.toString();
    model.rebase(text);
    onChange(text);
  }),
];

/** The body is not writable: a chat log carries no stray caret. */
export const readOnly: Extension = EditorView.editable.of(false);
