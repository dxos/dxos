//
// Copyright 2026 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { type Command, Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { busy, setBusy } from './busy-state';

//
// State.
//

/**
 * Pending (not-yet-committed) text injected from an external source.
 * `final` is the accumulated finalized text; `interim` is the volatile in-flight tail; `placeholder`
 * is shown while both are empty (e.g. "Recording…"). `anchor` is the document position the text will
 * be inserted at; it is mapped through document changes so it survives concurrent edits.
 */
export type PendingTextState = {
  anchor: number;
  final: string;
  interim: string;
  placeholder?: string;
};

/** Start a pending-text session at the given position, optionally showing a placeholder until text arrives. */
export const setPendingAnchor = StateEffect.define<{ anchor: number; placeholder?: string }>();

/** Append finalized text to the pending buffer; clears the interim tail and placeholder. */
export const appendPendingText = StateEffect.define<string>();

/** Replace the volatile in-flight tail. */
export const setPendingInterim = StateEffect.define<string>();

/** Discard the pending buffer without modifying the document. */
export const cancelPendingText = StateEffect.define<void>();

const emptyAt = (anchor: number, placeholder?: string): PendingTextState => ({
  anchor,
  final: '',
  interim: '',
  placeholder,
});

export const pendingTextState = StateField.define<PendingTextState | null>({
  create: () => null,
  update: (value, tr) => {
    // Map the anchor through document changes so injected text lands at the right place.
    let next = value && tr.docChanged ? { ...value, anchor: tr.changes.mapPos(value.anchor) } : value;
    for (const effect of tr.effects) {
      if (effect.is(setPendingAnchor)) {
        next = emptyAt(effect.value.anchor, effect.value.placeholder);
      } else if (effect.is(appendPendingText)) {
        const base = next ?? emptyAt(tr.state.selection.main.head);
        next = { ...base, final: base.final + effect.value, interim: '', placeholder: undefined };
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

const hasContent = (value: PendingTextState): boolean =>
  value.final.length > 0 || value.interim.length > 0 || (value.placeholder?.length ?? 0) > 0;

//
// Commands.
//

/** Insert the finalized pending text (followed by a newline) into the document and clear the buffer. */
export const commitPending: Command = (view) => {
  const value = view.state.field(pendingTextState, false);
  if (!value || value.final.length === 0) {
    return false;
  }

  const insert = value.final + '\n';
  view.dispatch({
    changes: { from: value.anchor, insert },
    selection: { anchor: value.anchor + insert.length },
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

// Commit when there is finalized text, otherwise just consume the key so the editor's default
// newline insertion cannot mutate the document mid-session (e.g. placeholder/interim-only state).
const commitOrConsumePending: Command = (view) => {
  const value = view.state.field(pendingTextState, false);
  if (!value) {
    return false;
  }

  return value.final.length > 0 ? commitPending(view) : true;
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
    return (
      other._state.final === this._state.final &&
      other._state.interim === this._state.interim &&
      other._state.placeholder === this._state.placeholder
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const root = Domino.of('span').classNames('cm-pending-text');
    if (this._state.final.length > 0) {
      root.append(Domino.of('span').classNames('cm-pending-text-final').text(this._state.final));
    }
    if (this._state.interim.length > 0) {
      root.append(Domino.of('span').classNames('cm-pending-text-interim').text(this._state.interim));
    }
    if (this._state.final.length === 0 && this._state.interim.length === 0 && this._state.placeholder) {
      root.append(Domino.of('span').classNames('cm-pending-text-placeholder').text(this._state.placeholder));
    }
    root.append(
      iconButton('ph--check--regular', 'Confirm', 'pending-text.confirm', () => commitPending(view)),
      iconButton('ph--x--regular', 'Cancel', 'pending-text.cancel', () => cancelPending(view)),
    );
    return root.root;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const pendingDecorations = EditorView.decorations.compute([pendingTextState], (state) => {
  const value = state.field(pendingTextState);
  if (!value || !hasContent(value)) {
    return Decoration.none;
  }

  return Decoration.set([Decoration.widget({ widget: new PendingTextWidget(value), side: 1 }).range(value.anchor)]);
});

// Flag the editor busy while a pending session is active so other extensions (e.g. the command-hint
// placeholder) suppress themselves. Deferred to a microtask to avoid dispatching mid-update.
const busyListener = EditorView.updateListener.of((update) => {
  const active = update.state.field(pendingTextState) != null;
  if (active === (update.startState.field(pendingTextState) != null)) {
    return;
  }
  queueMicrotask(() => {
    if ((update.view.state.field(pendingTextState) != null) === active) {
      update.view.dispatch({ effects: setBusy.of(active) });
    }
  });
});

const styles = EditorView.theme({
  '.cm-pending-text': {
    boxDecorationBreak: 'clone',
  },
  '.cm-pending-text-final': {
    boxShadow: '0 0 0 3px var(--color-cm-comment-surface)',
    backgroundColor: 'var(--color-cm-comment-surface)',
    color: 'var(--color-cm-comment-text) !important',
  },
  '.cm-pending-text-interim': {
    boxShadow: '0 0 0 3px var(--color-cm-comment-current-surface)',
    backgroundColor: 'var(--color-cm-comment-current-surface)',
    color: 'var(--color-cm-comment-text) !important',
  },
  '.cm-pending-text-placeholder': {
    color: 'var(--dx-subdued)',
    fontStyle: 'italic',
  },
  '.cm-pending-text-button': {
    display: 'inline-flex',
    cursor: 'pointer',
    marginInlineStart: '0.25rem',
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
 * Renders externally-supplied "pending" text as an inline preview at a tracked anchor, with inline
 * confirm/cancel affordances. An external controller drives the buffer via the `setPendingAnchor` /
 * `appendPendingText` / `setPendingInterim` / `cancelPendingText` effects; the user commits or
 * discards it via the affordances or the Enter/Escape keys. While a session is active the editor is
 * flagged {@link busy} so hint placeholders suppress themselves. The extension is agnostic to the
 * source of the text (e.g. speech transcription), so any CodeMirror component can opt in.
 */
export const pendingText = (): Extension => [
  pendingTextState,
  busy(),
  pendingDecorations,
  busyListener,
  styles,
  keymap.of([
    { key: 'Enter', run: commitOrConsumePending },
    { key: 'Escape', run: cancelPending },
  ]),
];
