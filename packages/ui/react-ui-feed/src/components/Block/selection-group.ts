//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { createContext, useContext, useMemo } from 'react';

/**
 * Coordinates selection across the items of one feed.
 *
 * Each item is its own editor with its own selection state, and `drawSelection` paints that state
 * whether or not the view has focus — so without a coordinator every message the reader has ever
 * selected in stays highlighted at once. The feed has one selection, so claiming it in one item
 * collapses it everywhere else.
 */
export type SelectionGroup = {
  /** Adds a view to the group; returns the disposer. */
  register: (view: EditorView) => () => void;
  /** Makes `view` the sole owner of the feed's selection. */
  claim: (view: EditorView) => void;
};

/** Creates a group; one per feed, provided to its items by `MessageList.Root`. */
export const createSelectionGroup = (): SelectionGroup => {
  const views = new Set<EditorView>();

  return {
    register: (view) => {
      views.add(view);
      return () => views.delete(view);
    },

    claim: (view) => {
      for (const other of views) {
        if (other === view || other.state.selection.main.empty) {
          continue;
        }
        // Collapsing re-enters this listener for `other`, but with an empty selection, which claims
        // nothing — so the cascade terminates after one pass.
        other.dispatch({ selection: { anchor: 0 } });
      }
    },
  };
};

export const SelectionGroupContext = createContext<SelectionGroup | undefined>(undefined);

/** The enclosing feed's selection group, or a private one when an item is used standalone. */
export const useSelectionGroup = (): SelectionGroup => {
  const provided = useContext(SelectionGroupContext);
  const fallback = useMemo(createSelectionGroup, []);
  return provided ?? fallback;
};
