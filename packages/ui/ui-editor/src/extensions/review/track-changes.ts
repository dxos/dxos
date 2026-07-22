//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType, keymap } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { computeWordHunks } from './diff';

export type TrackChangesOptions = {
  /**
   * The accepted base (`main`) the branch is diffed against. The editor's document is the branch, so
   * insertions and deletions are computed relative to this. Replace it live with {@link setBase} (e.g.
   * when a merge lands on main) rather than rebuilding the extension.
   */
  main: string;
  /** The branch author's palette colour (e.g. `var(--color-cyan-text)`) applied to the tracked marks. */
  colour: string;
};

/**
 * Replaces the tracked base without rebuilding the extension, so a merge to main re-diffs the live
 * document. The base is a {@link StateField} fed by this effect rather than a closure constant, matching
 * the production shape (see the bind-to-branch spike).
 */
export const setBase = StateEffect.define<string>();

/**
 * Google-Docs-style "Suggesting mode" via bind-to-branch: the editor is bound to the branch document
 * and edits accrue natively to it, while the diff against {@link TrackChangesOptions.main} is decorated
 * over the live buffer — insertions as author-coloured underlined marks, deletions as phantom
 * strikethrough widgets rendering the removed base text (which is absent from the document). A
 * replacement renders both, `~~old~~new`. Single author; foreign authors compose via the separate
 * `suggestions()` overlay.
 */
export const trackChanges = ({ main, colour }: TrackChangesOptions): Extension => {
  // The author colour is constant for the instance, so bind it to the insertion mark once. Structural
  // styling lives in the theme class; only the dynamic attribution colour is inline (as in `suggest.ts`).
  const insertMark = Decoration.mark({
    class: 'cm-track-insert',
    attributes: { style: `color:${colour};text-decoration-color:${colour}` },
  });

  const build = (base: string, state: EditorState): TrackState => {
    const doc = state.doc.toString();
    const decorations = [];
    const phantomRanges = [];
    const phantomPositions: number[] = [];
    for (const hunk of computeWordHunks(base, doc)) {
      // Deletion: base text absent from the branch. Anchor the phantom at `fromB` with `side: -1` so it
      // renders before a co-located insertion (giving `~~old~~new`).
      if (hunk.toA > hunk.fromA) {
        const widget = Decoration.widget({
          widget: new PhantomDeleteWidget(base.slice(hunk.fromA, hunk.toA), colour),
          side: -1,
        }).range(hunk.fromB);
        decorations.push(widget);
        phantomRanges.push(widget);
        phantomPositions.push(hunk.fromB);
      }
      // Insertion: branch text absent from the base.
      if (hunk.toB > hunk.fromB) {
        decorations.push(insertMark.range(hunk.fromB, hunk.toB));
      }
    }
    return {
      base,
      // `sort: true` orders the interleaved widget/mark ranges (co-located phantom before its mark).
      decorations: Decoration.set(decorations, true),
      atomic: Decoration.set(phantomRanges, true),
      phantoms: phantomPositions,
    };
  };

  const field = StateField.define<TrackState>({
    create: (state) => build(main, state),
    update: (value, transaction) => {
      let base = value.base;
      let baseChanged = false;
      for (const effect of transaction.effects) {
        if (effect.is(setBase)) {
          base = effect.value;
          baseChanged = true;
        }
      }
      if (!transaction.docChanged && !baseChanged) {
        return value;
      }
      return build(base, transaction.state);
    },
    provide: (self) => EditorView.decorations.from(self, (value) => value.decorations),
  });

  return [field, trackChangesKeymap(field), trackChangesAtomic(field), trackChangesTheme];
};

type TrackState = {
  base: string;
  decorations: DecorationSet;
  /** Phantom widgets only, for the atomic-range facet (they are zero-width, so this is inert today). */
  atomic: DecorationSet;
  /** Document offsets carrying a phantom, for the keymap guard. */
  phantoms: readonly number[];
};

/**
 * Phantom render of text present in `main` but deleted on the branch — struck through and
 * non-editable, since the text has no extent in the document.
 */
class PhantomDeleteWidget extends WidgetType {
  #text: string;
  #colour: string;

  constructor(text: string, colour: string) {
    super();
    this.#text = text;
    this.#colour = colour;
  }

  override eq(other: PhantomDeleteWidget): boolean {
    return other.#text === this.#text && other.#colour === this.#colour;
  }

  override toDOM(): HTMLElement {
    return (
      Domino.of('span')
        .classNames('cm-track-delete')
        .attributes({ contenteditable: 'false' })
        // Attribution colour is per-author (dynamic); the strikethrough itself is in the theme class.
        .style({ color: this.#colour, textDecorationColor: this.#colour })
        .text(this.#text).root
    );
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/**
 * A phantom has zero document extent, so the caret can only sit beside it — a plain Backspace beside a
 * phantom therefore deletes the real branch character hidden behind the strikethrough rather than the
 * phantom. Swallow it so tracked deletions read as protected units. Arrow keys need no override: the
 * zero-width phantom is stepped over in a single motion already.
 */
const trackChangesKeymap = (field: StateField<TrackState>): Extension =>
  keymap.of([
    {
      key: 'Backspace',
      run: (view) => {
        const selection = view.state.selection.main;
        return selection.empty && view.state.field(field).phantoms.includes(selection.head);
      },
    },
  ]);

/** Register the phantoms as atomic ranges so cursor motion treats each as one unit. */
const trackChangesAtomic = (field: StateField<TrackState>): Extension =>
  EditorView.atomicRanges.of((view) => view.state.field(field, false)?.atomic ?? Decoration.none);

const trackChangesTheme = EditorView.baseTheme({
  // Insertion: author-coloured (inline) and underlined so it reads as added, not merely tinted.
  '& .cm-track-insert': {
    textDecoration: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
  },
  // Deletion: struck through and de-emphasised; the removed base text, rendered as a phantom.
  '& .cm-track-delete': {
    textDecoration: 'line-through',
    opacity: 0.7,
  },
});
