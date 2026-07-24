//
// Copyright 2026 DXOS.org
//

import { Compartment, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type DiffHunk } from './diff';
import { type SuggestionSource, suggestions } from './suggest';

export type SuggestionsOverlay = {
  /** Initially empty; install once alongside the editor's other extensions. */
  extension: Extension;
  /**
   * Live-swaps the aggregated suggestion sources without remounting the editor. Pass `base` (the
   * accepted `main`) when the editor is bound to a diverged document (e.g. the user's own suggestion
   * branch in Suggesting mode) so each source is diffed against `base` and rebased into the document's
   * coordinates; omit it to diff sources directly against the editor document.
   */
  reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean, base?: string) => void;
};

/**
 * Compartment-backed overlay of ALL active suggestion branches' changes for the ambient review
 * model: the editor's default view renders every open suggestion branch as a live suggestion layer,
 * and the controller reconfigures the aggregated `sources` in place as branches open/close/edit —
 * mirroring how `MarkdownArticle` reconfigures its compare overlay via `compareCompartment`, so
 * toggling the overlay never remounts the editor (which would rebind automerge and lose
 * scroll/selection).
 */
export const suggestionsOverlay = (
  onAccept?: (hunk: DiffHunk, author: string) => void,
  onReject?: (hunk: DiffHunk, author: string) => void,
): SuggestionsOverlay => {
  const compartment = new Compartment();
  return {
    extension: compartment.of([]),
    reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean, base?: string) => {
      view.dispatch({
        effects: compartment.reconfigure(
          enabled && sources.length > 0 ? suggestions({ sources, base, onAccept, onReject }) : [],
        ),
      });
    },
  };
};
