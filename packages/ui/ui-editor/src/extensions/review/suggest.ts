//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { type DiffHunk, diffHunks } from './diff';

export type SuggestChangesOptions = {
  /** The proposal (e.g. a branch's content) whose changes are suggested over the editor's document. */
  proposal: string;
  /**
   * Invoked when a change is accepted. When provided, the container owns the mutation (routing the
   * accept through a durable operation that merges the hunk to the parent), so the extension does NOT
   * splice locally — it only dismisses the widget. Absent ⇒ the extension splices the proposal into
   * the document directly (standalone use).
   */
  onAccept?: (hunk: DiffHunk) => void;
  /**
   * Invoked when a change is rejected. Lets the container route the reject through a durable operation
   * (revert the hunk on the author's branch). The widget is dismissed either way.
   */
  onReject?: (hunk: DiffHunk) => void;
};

/** Position-independent key so a dismissal survives offset shifts from unrelated edits. */
export const suggestionKey = (hunk: DiffHunk): string => `${hunk.removed}»${hunk.inserted}`;

/** Adds a hunk to the dismissed (rejected, hidden) set without changing the document. */
const dismissEffect = StateEffect.define<string>();

type SuggestionState = {
  dismissed: ReadonlySet<string>;
  decorations: DecorationSet;
};

/**
 * Google-Docs-style suggestion overlay: renders each change between the editor's document (the
 * original) and `proposal` in place — the removed original struck through, the proposed replacement
 * shown beside it — with inline Accept/Reject controls. Accept splices the proposal's version of that
 * hunk into the document (merging the change); Reject hides the suggestion without altering the
 * document (a view-only dismissal for the session).
 */
export const suggestChanges = ({ proposal, onAccept, onReject }: SuggestChangesOptions): Extension => {
  const build = (state: EditorState, dismissed: ReadonlySet<string>): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    for (const hunk of diffHunks(state.doc.toString(), proposal)) {
      if (dismissed.has(suggestionKey(hunk))) {
        continue;
      }
      if (hunk.to > hunk.from) {
        builder.add(hunk.from, hunk.to, deleteMark);
      }
      builder.add(
        hunk.to,
        hunk.to,
        Decoration.widget({ widget: new SuggestionWidget(hunk, onAccept, onReject), side: 1 }),
      );
    }
    return builder.finish();
  };

  const field = StateField.define<SuggestionState>({
    create: (state) => ({ dismissed: new Set(), decorations: build(state, new Set()) }),
    update: (value, transaction) => {
      const dismissed = new Set(value.dismissed);
      let changed = false;
      for (const effect of transaction.effects) {
        if (effect.is(dismissEffect)) {
          dismissed.add(effect.value);
          changed = true;
        }
      }
      if (!transaction.docChanged && !changed) {
        return value;
      }
      return { dismissed, decorations: build(transaction.state, dismissed) };
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
  });

  return [field, suggestTheme];
};

const deleteMark = Decoration.mark({ class: 'cm-suggest-delete' });

/** Inline preview of the proposed text plus Accept/Reject controls for a single change. */
class SuggestionWidget extends WidgetType {
  #hunk: DiffHunk;
  #onAccept?: (hunk: DiffHunk) => void;
  #onReject?: (hunk: DiffHunk) => void;

  constructor(hunk: DiffHunk, onAccept?: (hunk: DiffHunk) => void, onReject?: (hunk: DiffHunk) => void) {
    super();
    this.#hunk = hunk;
    this.#onAccept = onAccept;
    this.#onReject = onReject;
  }

  override eq(other: SuggestionWidget): boolean {
    return other.#hunk.removed === this.#hunk.removed && other.#hunk.inserted === this.#hunk.inserted;
  }

  override toDOM(view: EditorView): HTMLElement {
    const children: Domino<HTMLElement>[] = [];
    if (this.#hunk.inserted) {
      children.push(Domino.of('span').classNames('cm-suggest-insert').text(this.#hunk.inserted));
    }

    children.push(
      // Each control is a `dx-button` div wrapping a Phosphor icon.
      Domino.of('div')
        .classNames('dx-button aspect-square cm-suggest-accept -mt-[3px]')
        .attributes({ 'role': 'button', 'data-density': 'sm', 'title': 'Accept change' })
        .append(Domino.svg('ph--check--regular'))
        .on('mousedown', (event) => {
          event.preventDefault();
          if (this.#onAccept) {
            // The container owns the mutation (durable cherry-pick op); the op's edit flows back and
            // re-diffs the hunk away. Dismiss for immediate feedback — do not splice locally (that
            // would double-apply the change onto the parent).
            view.dispatch({ effects: dismissEffect.of(suggestionKey(this.#hunk)) });
            this.#onAccept(this.#hunk);
          } else {
            view.dispatch({ changes: { from: this.#hunk.from, to: this.#hunk.to, insert: this.#hunk.inserted } });
          }
        }),
      Domino.of('div')
        .classNames('dx-button aspect-square cm-suggest-reject -mt-[3px]')
        .attributes({ 'role': 'button', 'data-density': 'sm', 'title': 'Reject change' })
        .append(Domino.svg('ph--x--regular'))
        .on('mousedown', (event) => {
          event.preventDefault();
          view.dispatch({ effects: dismissEffect.of(suggestionKey(this.#hunk)) });
          this.#onReject?.(this.#hunk);
        }),
    );

    return Domino.of('span')
      .classNames('cm-suggest-actions')
      .append(...children).root;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const suggestTheme = EditorView.baseTheme({
  '& .cm-suggest-delete': {
    backgroundColor: 'var(--color-error-bg)',
    textDecoration: 'line-through',
    opacity: 0.7,
    borderRadius: '2px',
  },
  '& .cm-suggest-insert': {
    backgroundColor: 'var(--color-success-bg)',
    borderRadius: '2px',
  },
  // Inline (not a flex row) so the green suggestion box matches the struck-through original's
  // height — a flex row would stretch it to the taller accept/reject controls.
  '& .cm-suggest-actions': {
    marginInlineStart: '2px',
  },
  // Size the controls to the text so `vertical-align: middle` centers them on the line (the default
  // `xs` density is taller than the text and reads as sitting low next to the change chips).
  '& .cm-suggest-accept, & .cm-suggest-reject': {
    verticalAlign: 'middle',
    marginInlineStart: '2px',
    blockSize: '1.3em',
    inlineSize: '1.3em',
    minBlockSize: '0',
  },
  '& .cm-suggest-accept': {
    color: 'var(--color-success-text)',
  },
  '& .cm-suggest-reject': {
    color: 'var(--color-error-text)',
  },
});
