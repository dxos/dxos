//
// Copyright 2026 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { type Command, Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';

import { Domino } from '@dxos/ui';

//
// State.
//

/**
 * Pending (not-yet-committed) text injected from an external source.
 * `final` is the accumulated finalized text; `interim` is the volatile in-flight tail.
 * `anchor` is the document position the text will be inserted at; it is mapped through
 * document changes so it survives concurrent edits and prior insertions.
 */
export type PendingTextState = {
  anchor: number;
  final: string;
  interim: string;
};

/** Start a pending-text session at the given document position. */
export const setPendingAnchor = StateEffect.define<number>();

/** Append finalized text to the pending buffer; clears the interim tail. */
export const appendPendingText = StateEffect.define<string>();

/** Replace the volatile in-flight tail. */
export const setPendingInterim = StateEffect.define<string>();

/** Discard the pending buffer without modifying the document. */
export const cancelPendingText = StateEffect.define<void>();

const emptyAt = (anchor: number): PendingTextState => ({ anchor, final: '', interim: '' });

export const pendingTextState = StateField.define<PendingTextState | null>({
  create: () => null,
  update: (value, tr) => {
    // Map the anchor through document changes so injected text lands at the right place.
    let next = value && tr.docChanged ? { ...value, anchor: tr.changes.mapPos(value.anchor) } : value;
    for (const effect of tr.effects) {
      if (effect.is(setPendingAnchor)) {
        next = emptyAt(effect.value);
      } else if (effect.is(appendPendingText)) {
        const base = next ?? emptyAt(tr.state.selection.main.head);
        next = { ...base, final: base.final + effect.value, interim: '' };
      } else if (effect.is(setPendingInterim)) {
        const base = next ?? emptyAt(tr.state.selection.main.head);
        next = { ...base, interim: effect.value };
      } else if (effect.is(cancelPendingText)) {
        next = null;
      }
    }

    return next;
  },
});

//
// Commands.
//

/** Insert the finalized pending text into the document and clear the buffer. */
export const commitPending: Command = (view) => {
  const value = view.state.field(pendingTextState, false);
  if (!value || value.final.length === 0) {
    return false;
  }

  const to = value.anchor + value.final.length;
  view.dispatch({
    changes: { from: value.anchor, insert: value.final },
    selection: { anchor: to },
    effects: cancelPendingText.of(),
  });
  return true;
};

/** Discard the pending text without modifying the document. */
export const cancelPending: Command = (view) => {
  if (!view.state.field(pendingTextState, false)) {
    return false;
  }

  view.dispatch({ effects: cancelPendingText.of() });
  return true;
};

//
// Decorations.
//

const iconButton = (icon: string, label: string, testId: string, onClick: () => void): Domino<HTMLElement> =>
  Domino.of('button')
    .classNames('cm-pending-text-button')
    .attributes({ type: 'button', 'aria-label': label, 'data-testid': testId })
    .append(Domino.svg(icon))
    // `mousedown` + preventDefault so clicking the affordance does not steal the editor selection.
    .on('mousedown', (event) => {
      event.preventDefault();
      onClick();
    });

class PendingTextWidget extends WidgetType {
  constructor(private readonly _state: PendingTextState) {
    super();
  }

  override eq(other: PendingTextWidget): boolean {
    return other._state.final === this._state.final && other._state.interim === this._state.interim;
  }

  override toDOM(view: EditorView): HTMLElement {
    return Domino.of('span')
      .classNames('cm-pending-text')
      .append(
        Domino.of('span').classNames('cm-pending-text-final').text(this._state.final),
        Domino.of('span').classNames('cm-pending-text-interim').text(this._state.interim),
        iconButton('ph--check--regular', 'Confirm', 'pending-text.confirm', () => commitPending(view)),
        iconButton('ph--x--regular', 'Cancel', 'pending-text.cancel', () => cancelPending(view)),
      ).root;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const pendingDecorations = EditorView.decorations.compute([pendingTextState], (state) => {
  const value = state.field(pendingTextState);
  if (!value || (value.final.length === 0 && value.interim.length === 0)) {
    return Decoration.none;
  }

  return Decoration.set([Decoration.widget({ widget: new PendingTextWidget(value), side: 1 }).range(value.anchor)]);
});

const styles = EditorView.theme({
  '.cm-pending-text': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  '.cm-pending-text-final': {
    color: 'var(--dx-subdued)',
  },
  '.cm-pending-text-interim': {
    color: 'var(--dx-subdued)',
    opacity: 0.6,
  },
  '.cm-pending-text-button': {
    display: 'inline-flex',
    cursor: 'pointer',
    color: 'var(--dx-subdued)',
  },
  '.cm-pending-text-button:hover': {
    color: 'var(--dx-accentText)',
  },
});

//
// Extension.
//

/**
 * Renders externally-supplied "pending" text as an inline preview at a tracked anchor, with
 * inline confirm/cancel affordances. An external controller drives the buffer via the
 * `setPendingAnchor` / `appendPendingText` / `setPendingInterim` / `cancelPendingText` effects;
 * the user commits or discards it via the affordances or the Enter/Escape keys. The extension is
 * agnostic to the source of the text (e.g. speech transcription), so any CodeMirror component can
 * opt in.
 */
export const pendingText = (): Extension => [
  pendingTextState,
  pendingDecorations,
  styles,
  keymap.of([
    { key: 'Enter', run: commitPending },
    { key: 'Escape', run: cancelPending },
  ]),
];
