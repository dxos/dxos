//
// Copyright 2026 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { type Command, Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { type MarkerHue, markerButtons, markerText, markerTheme } from '../../decoration/marker';
import { busy, setBusy } from '../../state/busy';

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

/** Replace the finalized buffer wholesale (e.g. with post-processed text). */
export const setPendingFinal = StateEffect.define<string>();

/** Discard the pending buffer without modifying the document. */
export const cancelPendingText = StateEffect.define<void>();

const emptyAt = (anchor: number, placeholder?: string): PendingTextState => ({
  anchor,
  final: '',
  interim: '',
  placeholder,
});

/** StateField holding the pending text buffer (anchor, final, interim, placeholder); building block of the pendingText extension. */
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
      } else if (effect.is(setPendingFinal)) {
        // Replace the EXISTING buffer only; never resurrect a cancelled/empty session. This lets a
        // late post-process result (e.g. entity linking) be dropped if the user cancelled meanwhile.
        if (next) {
          next = { ...next, final: effect.value, placeholder: undefined };
        }
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

/**
 * Insert the finalized pending text into the document and clear the buffer. The text is terminated
 * with a newline; when committed at the end of the document an extra newline is added so the document
 * always ends with a blank line.
 */
export const commitPending: Command = (view) => {
  const value = view.state.field(pendingTextState, false);
  if (!value || value.final.length === 0) {
    return false;
  }

  const atEnd = value.anchor >= view.state.doc.length;
  const insert = value.final + (atEnd ? '\n\n' : '\n');
  view.dispatch({
    // Place the cursor on the line after the inserted text (before the trailing blank line).
    changes: { from: value.anchor, insert },
    selection: { anchor: value.anchor + value.final.length + 1 },
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

// Finalized + interim text share one teal marker (a single transcription); the placeholder uses a
// rose marker with a pulsing icon to signal active recording.
const TEXT_HUE: MarkerHue = 'teal';
const PLACEHOLDER_HUE: MarkerHue = 'rose';

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
    if (this._state.final.length > 0 || this._state.interim.length > 0) {
      const marker = Domino.of('span').classNames('cm-marker-text').attributes({ 'data-hue': TEXT_HUE });
      if (this._state.final.length > 0) {
        marker.append(Domino.of('span').text(this._state.final));
      }
      if (this._state.interim.length > 0) {
        marker.append(Domino.of('span').classNames('cm-pending-text-interim').text(this._state.interim));
      }
      root.append(marker);
    } else if (this._state.placeholder) {
      root.append(
        markerText(this._state.placeholder, {
          hue: PLACEHOLDER_HUE,
          className: 'cm-pending-text-indicator',
          icon: 'ph--circle-notch--regular',
          iconClassNames: 'animate-spin',
        }),
      );
    }

    root.append(
      markerButtons([
        {
          icon: 'ph--check--regular',
          label: 'Confirm',
          className: 'cm-marker-button-success',
          testId: 'pending-text.confirm',
          onClick: () => commitPending(view),
        },
        {
          icon: 'ph--x--regular',
          label: 'Cancel',
          className: 'cm-marker-button-error',
          testId: 'pending-text.cancel',
          onClick: () => cancelPending(view),
        },
      ]),
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
  markerTheme(),
  styles,
  keymap.of([
    { key: 'Enter', run: commitOrConsumePending },
    { key: 'Escape', run: cancelPending },
  ]),
];

const styles = EditorView.theme({
  // Keep the marker and affordances on a single line (it already sits on its own line at the anchor).
  '.cm-pending-text': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  // The interim tail is distinguished from the finalized text only by reduced opacity.
  '.cm-pending-text-interim': {
    opacity: 0.6,
  },
  // Keep the "Recording…" indicator (text + spinner) on a single line.
  '.cm-pending-text-indicator': {
    whiteSpace: 'nowrap',
  },
});
