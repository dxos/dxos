//
// Copyright 2025 DXOS.org
//

import { Compartment, type EditorState, Facet, type SelectionRange } from '@codemirror/state';
import { type Command, type EditorView } from '@codemirror/view';

import { treeFacet } from './tree';

export type Selection = number[];

export const getSelection = (state: EditorState): SelectionRange => state.selection.main;

export const selectionEquals = (a: number[], b: number[]) => a.length === b.length && a.every((i) => b.includes(i));

export const selectionFacet = Facet.define<Selection, Selection>({
  combine: (values) => values[0],
});

export const selectionCompartment = new Compartment();

export const selectNone: Command = (view: EditorView) => {
  view.dispatch({
    effects: selectionCompartment.reconfigure(selectionFacet.of([])),
  });

  return true;
};

export const selectAll: Command = (view: EditorView) => {
  const tree = view.state.facet(treeFacet);
  const selection = view.state.facet(selectionFacet);
  const items: Selection = [];
  tree.traverse((item) => items.push(item.index));
  view.dispatch({
    effects: selectionCompartment.reconfigure(selectionFacet.of(selectionEquals(selection, items) ? [] : items)),
  });

  return true;
};

// TODO(burdon): Implement.
export const selectUp: Command = (view: EditorView) => true;

// TODO(burdon): Implement.
export const selectDown: Command = (view: EditorView) => true;
