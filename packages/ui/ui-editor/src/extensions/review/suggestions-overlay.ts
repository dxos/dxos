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
  /** Live-swaps the aggregated suggestion sources without remounting the editor. */
  reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean) => void;
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
    reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean) => {
      view.dispatch({
        effects: compartment.reconfigure(
          enabled && sources.length > 0 ? suggestions({ sources, onAccept, onReject }) : [],
        ),
      });
    },
  };
};
