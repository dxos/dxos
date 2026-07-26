//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension, StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/** A user edit captured by {@link suggestInput}, in the coordinates of the editor's (main) document. */
export type RoutedChange = {
  from: number;
  to: number;
  insert: string;
};

export type SuggestInputOptions = {
  /**
   * Receives every user edit instead of the document. The host applies it to the suggestion branch;
   * the overlay then renders it as the user's tracked change, so the editor document — main — is only
   * ever changed by sync and by Accept.
   */
  onChange: (changes: RoutedChange[]) => void;
};

/**
 * The Suggesting capture layer: the editor stays bound to main and this filter routes the user's
 * document-changing transactions to the suggestion branch instead of applying them. Mode switches
 * then toggle this filter and the overlay's decorations — never the document binding — so the view is
 * not torn down and caret, selection and focus survive by construction.
 *
 * Only USER edits are captured (`userEvent` input/delete/move/undo transactions); remote sync and
 * programmatic transactions (Accept's splice, overlay reconfiguration) pass through untouched. IME
 * composition is never intercepted mid-flight: composition transactions apply locally and the
 * composed run is routed on the transaction that ends the session, then excised.
 */
// Accumulates the document span the current IME composition occupies. Mid-composition transactions
// must apply locally (cancelling them breaks the IME); the span is excised and routed when the
// composition closes. Tracked as a state field so the filter — which runs against transactions, not
// the view — reads it synchronously; composition END is only observable on the view, so a companion
// view plugin performs the excision.
type Composition = { from: number; to: number } | undefined;

const composingField = StateField.define<Composition>({
  create: () => undefined,
  update: (value, transaction) => {
    const event = transaction.annotation(Transaction.userEvent);
    if (event === 'input.type.compose') {
      let next = value;
      transaction.changes.iterChanges((from, _to, _from2, to2) => {
        next = next ? { from: Math.min(next.from, from), to: to2 } : { from, to: to2 };
      });
      return next;
    }
    if (transaction.effects.some((effect) => effect.is(clearComposition))) {
      return undefined;
    }
    if (value && transaction.docChanged) {
      // Map the pending span through unrelated changes so the excision targets the right range.
      return { from: transaction.changes.mapPos(value.from, -1), to: transaction.changes.mapPos(value.to, 1) };
    }
    return value;
  },
});

/** Clears the pending composition span once it has been excised and routed. */
const clearComposition = StateEffect.define<null>();

export const suggestInput = (options: SuggestInputOptions): Extension => [
  composingField,
  EditorState.transactionFilter.of((transaction: Transaction) => {
    if (!transaction.docChanged) {
      return transaction;
    }

    // Remote sync / programmatic updates (Accept's splice, the composition excision below) apply to
    // the document as usual.
    const event = transaction.annotation(Transaction.userEvent);
    if (!event) {
      return transaction;
    }

    // Mid-composition text must reach the document or the IME breaks; it is excised and routed by the
    // view plugin when the composition closes.
    if (event === 'input.type.compose') {
      return transaction;
    }

    const changes: RoutedChange[] = [];
    transaction.changes.iterChanges((from, to, _from2, _to2, inserted) => {
      changes.push({ from, to, insert: inserted.toString() });
    });
    options.onChange(changes);

    // Cancel the local edit but keep the user's selection so the caret stays where the routed text
    // will appear once the overlay renders it.
    return {
      changes: [],
      selection: transaction.startState.selection,
      effects: transaction.effects,
      scrollIntoView: transaction.scrollIntoView,
    };
  }),
  // Composition end is only observable on the view: excise the composed span from main (a
  // programmatic transaction, so the filter passes it) and route it as one edit.
  EditorView.updateListener.of((update) => {
    const pending = update.state.field(composingField);
    if (!pending || update.view.composing) {
      return;
    }
    const composed = update.state.doc.sliceString(pending.from, pending.to);
    options.onChange([{ from: pending.from, to: pending.from, insert: composed }]);
    queueMicrotask(() =>
      update.view.dispatch({
        changes: { from: pending.from, to: pending.to },
        effects: clearComposition.of(null),
      }),
    );
  }),
];
