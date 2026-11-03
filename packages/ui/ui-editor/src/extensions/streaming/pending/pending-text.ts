//
// Copyright 2026 DXOS.org
//

import { type ChangeDesc, type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
import {
  type Command,
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { type MarkerHue, markerButtons, markerText, markerTheme } from '../../decoration/marker.ts';
import { busy, setBusy } from '../../state/busy.ts';

//
// State.
//

/**
 * How committed text joins the document:
 * - `line` terminates it with a newline (dictation).
 * - `paragraph` separates it from its neighbours with blank lines.
 * - `inline` replaces `anchor`..`to` with it as-is (a correction inside a paragraph).
 */
export type PendingTextLayout = 'line' | 'paragraph' | 'inline';

/** Where and how a pending-text session inserts its text. */
export type PendingTextAnchor = {
  anchor: number;
  /** End of the range the text replaces; defaults to `anchor` (a pure insertion). */
  to?: number;
  layout?: PendingTextLayout;
  placeholder?: string;
};

/**
 * Pending (not-yet-committed) text injected from an external source.
 * `final` is the accumulated finalized text; `interim` is the volatile in-flight tail; `placeholder`
 * is shown while both are empty (e.g. "Recording…"). `anchor`..`to` is the document range the text will
 * replace; it is mapped through document changes so it survives concurrent edits.
 */
export type PendingTextState = {
  anchor: number;
  to: number;
  layout: PendingTextLayout;
  final: string;
  interim: string;
  placeholder?: string;
};

/** Start a pending-text session at the given position, optionally showing a placeholder until text arrives. */
export const setPendingAnchor = StateEffect.define<PendingTextAnchor>();

/** Append finalized text to the pending buffer; clears the interim tail and placeholder. */
export const appendPendingText = StateEffect.define<string>();

/** Replace the volatile in-flight tail. */
export const setPendingInterim = StateEffect.define<string>();

/** Replace the finalized buffer wholesale (e.g. with post-processed text). */
export const setPendingFinal = StateEffect.define<string>();

/** Discard the pending buffer without modifying the document. */
export const cancelPendingText = StateEffect.define<void>();

const emptyAt = ({ anchor, to = anchor, layout = 'line', placeholder }: PendingTextAnchor): PendingTextState => ({
  anchor,
  to: Math.max(anchor, to),
  layout,
  final: '',
  interim: '',
  placeholder,
});

/** StateField holding the pending text buffer (anchor, final, interim, placeholder); building block of the pendingText extension. */
export const pendingTextState = StateField.define<PendingTextState | null>({
  create: () => null,
  update: (value, tr) => {
    // Map the anchor through document changes so injected text lands at the right place.
    let next = value && tr.docChanged ? mapRange(value, tr.changes) : value;
    for (const effect of tr.effects) {
      if (effect.is(setPendingAnchor)) {
        next = emptyAt(effect.value);
      } else if (effect.is(appendPendingText)) {
        const base = next ?? emptyAt({ anchor: tr.state.selection.main.head });
        next = { ...base, final: base.final + effect.value, interim: '', placeholder: undefined };
      } else if (effect.is(setPendingInterim)) {
        const base = next ?? emptyAt({ anchor: tr.state.selection.main.head });
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

// The replaced range keeps hugging its text: edits at its edges fall outside it.
const mapRange = (value: PendingTextState, changes: ChangeDesc): PendingTextState => {
  const anchor = changes.mapPos(value.anchor, 1);
  return { ...value, anchor, to: Math.max(anchor, changes.mapPos(value.to, -1)) };
};

const hasContent = (value: PendingTextState): boolean =>
  value.final.length > 0 || value.interim.length > 0 || (value.placeholder?.length ?? 0) > 0;

//
// Commands.
//

/** Newlines needed so `text` at `from`..`to` reads as its own paragraph. */
const paragraphBreaks = (state: EditorState, from: number, to: number): { before: string; after: string } => {
  const { doc } = state;
  const before = doc.sliceString(Math.max(0, from - 2), from);
  const after = doc.sliceString(to, to + 2);
  return {
    before: from === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n',
    after: after.startsWith('\n\n') ? '' : after.startsWith('\n') || to >= doc.length ? '\n' : '\n\n',
  };
};

/**
 * Insert the finalized pending text into the document and clear the buffer, joining it as its layout says. A `line`
 * is terminated with a newline, plus a blank line when committed at the end of the document.
 */
export const commitPending: Command = (view) => {
  const value = view.state.field(pendingTextState, false);
  if (!value || value.final.length === 0) {
    return false;
  }

  const { anchor: from, to, final } = value;
  let before = '';
  let after = '';
  switch (value.layout) {
    case 'line':
      after = from >= view.state.doc.length ? '\n\n' : '\n';
      break;
    case 'paragraph':
      ({ before, after } = paragraphBreaks(view.state, from, to));
      break;
  }

  view.dispatch({
    changes: { from, to, insert: before + final + after },
    // A line or paragraph leaves the cursor on the line after it; a correction leaves it at the correction's end.
    selection: { anchor: from + before.length + final.length + (value.layout === 'inline' ? 0 : 1) },
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

/** How long the preview must be unchanged before its confirm/cancel affordances appear. */
const SETTLE_DELAY = 600;

/** Blank lines a `paragraph` preview draws around itself, matching what committing it will add. */
type ParagraphSpacing = { before: boolean; after: boolean };

class PendingTextWidget extends WidgetType {
  constructor(
    private readonly _state: PendingTextState,
    private readonly _spacing?: ParagraphSpacing,
  ) {
    super();
  }

  override eq(other: PendingTextWidget): boolean {
    return (
      other._state.final === this._state.final &&
      other._state.interim === this._state.interim &&
      other._state.placeholder === this._state.placeholder &&
      other._spacing?.before === this._spacing?.before &&
      other._spacing?.after === this._spacing?.after
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const root = Domino.of(this._spacing ? 'div' : 'span').classNames(
      'cm-pending-text',
      this._state.layout === 'inline' && 'cm-pending-text-inline',
      this._spacing && 'cm-pending-text-paragraph',
      this._spacing?.before && 'cm-pending-text-space-before',
      this._spacing?.after && 'cm-pending-text-space-after',
    );
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

    // Every change rebuilds the widget, so a widget left standing this long means the text has stopped arriving.
    const element = root.root;
    setTimeout(() => element.setAttribute('data-settled', ''), SETTLE_DELAY);
    return element;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/** Strikes through the text a correction will replace. */
const replacedMark = Decoration.mark({ class: 'cm-pending-text-replaced' });

const replaced = ({ anchor, to }: PendingTextState) => (to > anchor ? [replacedMark.range(anchor, to)] : []);

const pendingDecorations = EditorView.decorations.compute(['doc', pendingTextState], (state) => {
  const value = state.field(pendingTextState);
  if (!value || !hasContent(value)) {
    return Decoration.none;
  }

  // A paragraph previews as its own block above the anchor's line: that line supplies the blank line after it when
  // empty, so only the gaps commit would add are drawn.
  if (value.layout === 'paragraph') {
    const line = state.doc.lineAt(value.anchor);
    const { before } = paragraphBreaks(state, value.anchor, value.to);
    const spacing = { before: before.length > 0, after: line.length > 0 };
    const widget = Decoration.widget({ widget: new PendingTextWidget(value, spacing), block: true, side: -1 });
    return Decoration.set([widget.range(line.from), ...replaced(value)], true);
  }

  const widget = Decoration.widget({ widget: new PendingTextWidget(value), side: 1 }).range(value.to);
  return Decoration.set([...replaced(value), widget], true);
});

/**
 * Marks the content element while the preview is on screen.
 *
 * `@codemirror/view`'s own placeholder keys off an empty document, and pending text is a decoration
 * rather than document content — so dictating into an empty editor draws the placeholder underneath
 * the words being spoken. That placeholder takes no condition, so it is suppressed from the DOM side
 * instead (see {@link styles}).
 *
 * Conditioned exactly as the decoration is: the placeholder goes when the preview arrives to cover
 * it, not when the mic is tapped — opening a session paints nothing, and blanking the hint before
 * there is anything to read in its place would only empty the field.
 */
const pendingAttributes = EditorView.contentAttributes.compute([pendingTextState], (state) => {
  const value = state.field(pendingTextState);
  const attributes: Record<string, string> = {};
  if (value && hasContent(value)) {
    attributes['data-pending-text'] = '';
  }
  return attributes;
});

// Flag the editor busy while a pending session is active so other extensions (e.g. the command-hint
// placeholder) suppress themselves. Deferred to a microtask to avoid dispatching mid-update, and
// carried by a ViewPlugin so the deferred work is bound to the extension's lifetime: a bare
// updateListener's microtask outlives a reconfigure that drops the extension and would then read a
// StateField the configuration no longer has.
const busyReporter = ViewPlugin.fromClass(
  class {
    /** Set once the plugin leaves the configuration, so queued microtasks abandon their dispatch. */
    #destroyed = false;

    update(update: ViewUpdate): void {
      // The previous configuration need not have included the field (this may be the update that
      // introduced the extension), so the prior value is read defensively.
      const wasActive = update.startState.field(pendingTextState, false) != null;
      const active = update.state.field(pendingTextState) != null;
      if (active === wasActive) {
        return;
      }

      queueMicrotask(() => {
        if (this.#destroyed) {
          return;
        }
        if ((update.view.state.field(pendingTextState) != null) === active) {
          update.view.dispatch({ effects: setBusy.of(active) });
        }
      });
    }

    destroy(): void {
      this.#destroyed = true;
    }
  },
);

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
  pendingAttributes,
  busyReporter,
  markerTheme(),
  styles,
  keymap.of([
    { key: 'Enter', run: commitOrConsumePending },
    { key: 'Escape', run: cancelPending },
  ]),
];

const styles = EditorView.theme({
  // See {@link pendingAttributes}: the built-in placeholder would otherwise sit behind the preview.
  '.cm-content[data-pending-text] .cm-placeholder': {
    display: 'none',
  },
  '.cm-pending-text': {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  // Float the affordances above the preview's end so showing them never reflows the text.
  '.cm-pending-text .cm-marker-buttons': {
    position: 'absolute',
    insetBlockEnd: '100%',
    insetInlineEnd: '0',
    zIndex: 1,
    marginBlockEnd: '2px',
    padding: '2px',
    borderRadius: '6px',
    border: '1px solid var(--color-separator)',
    backgroundColor: 'var(--color-base-surface)',
    transition: 'opacity 150ms ease-out',
  },
  // The interim tail is distinguished from the finalized text only by reduced opacity.
  '.cm-pending-text-interim': {
    opacity: 0.6,
  },
  // Hidden while streaming so the affordances do not flicker as each word rebuilds the widget.
  '.cm-pending-text:not([data-settled]) .cm-marker-buttons': {
    visibility: 'hidden',
    opacity: 0,
  },
  '.cm-pending-text-paragraph': {
    display: 'flex',
    alignItems: 'start',
  },
  '.cm-pending-text-space-before': {
    marginBlockStart: '1lh',
  },
  '.cm-pending-text-space-after': {
    marginBlockEnd: '1lh',
  },
  // A correction follows the struck-through words it replaces.
  '.cm-pending-text-inline': {
    marginInlineStart: '0.25em',
  },
  '.cm-pending-text-replaced': {
    textDecoration: 'line-through',
    opacity: 0.6,
  },
  // Keep the "Recording…" indicator (text + spinner) on a single line.
  '.cm-pending-text-indicator': {
    whiteSpace: 'nowrap',
  },
});
