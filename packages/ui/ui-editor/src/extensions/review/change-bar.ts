//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, Facet, RangeSet } from '@codemirror/state';
import { EditorView, GutterMarker, gutter } from '@codemirror/view';

/** A change-bar gutter marker: a full-height vertical bar tinted with the author's colour. */
export class ChangeBarMarker extends GutterMarker {
  #colour: string;

  constructor(colour: string) {
    super();
    this.#colour = colour;
  }

  override eq(other: ChangeBarMarker): boolean {
    return other.#colour === this.#colour;
  }

  override toDOM(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'cm-change-bar';
    // Attribution colour is per-author (dynamic); the bar geometry lives in the theme class.
    bar.style.background = this.#colour;
    return bar;
  }
}

/**
 * Per-line change-bar markers for one suggestion source, derived from editor state. Contributed by the
 * suggestion extensions (`trackChanges`, `suggestions`) so each can colour its own lines by author.
 */
export type ChangeBarProvider = (state: EditorState) => RangeSet<GutterMarker>;

const changeBarTheme = EditorView.baseTheme({
  '& .cm-change-bar-gutter': {
    width: '3px',
    paddingInline: '1px',
  },
  '& .cm-change-bar': {
    width: '3px',
    height: '100%',
    borderRadius: '1px',
  },
});

/**
 * Providers of per-line change bars. `enables` adds the single shared gutter (+ theme) once when any
 * provider is present — identical extension instances dedupe — so own edits (`trackChanges`) and foreign
 * suggestions (`suggestions`) share one bar column rather than stacking separate gutters. The gutter is
 * built inside `enables` so its `markers` can read this same facet.
 */
const changeBarProviders = Facet.define<ChangeBarProvider>({
  enables: (self) => [
    gutter({
      class: 'cm-change-bar-gutter',
      // Merge every contributor's per-line markers into the shared gutter (sorted so co-located markers
      // from different sources interleave rather than throw).
      markers: (view) => {
        const sets = view.state.facet(self).map((provider) => provider(view.state));
        return sets.length ? RangeSet.join(sets) : RangeSet.empty;
      },
    }),
    changeBarTheme,
  ],
});

/** Contribute per-line change bars to the shared author-coloured gutter (see {@link ChangeBarMarker}). */
export const changeBars = (provider: ChangeBarProvider): Extension => changeBarProviders.of(provider);
