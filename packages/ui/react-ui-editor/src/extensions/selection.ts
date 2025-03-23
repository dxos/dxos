//
// Copyright 2024 DXOS.org
//

import { type Extension, Transaction, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { debounce } from '@dxos/async';

import { singleValueFacet } from '../util';

/**
 * Currently edited document id as FQ string.
 */
export const documentId = singleValueFacet<string>();

export type EditorSelection = {
  anchor: number;
  head?: number;
};

export type EditorSelectionState = {
  scrollTo?: number;
  selection?: EditorSelection;
};

const stateRestoreAnnotation = 'dxos.org/cm/state-restore';

export const createEditorStateTransaction = ({ scrollTo, selection }: EditorSelectionState): TransactionSpec => {
  return {
    selection,
    scrollIntoView: !scrollTo,
    effects: scrollTo ? EditorView.scrollIntoView(scrollTo, { yMargin: 96 }) : undefined,
    annotations: Transaction.userEvent.of(stateRestoreAnnotation),
  };
};

/**
 * Track scrolling and selection state to be restored when switching to document.
 */
export const selectionState = (state: Record<string, EditorSelectionState> = {}): Extension => {
  const setState = (id: string, selectionState: EditorSelectionState) => {
    state[id] = selectionState;
  };
  const setStateDebounced = debounce(setState!, 1_000);

  return [
    // TODO(burdon): Track scrolling (currently only updates when cursor moves).
    // EditorView.domEventHandlers({
    //   scroll: (event) => {
    //     setStateDebounced(id, {});
    //   },
    // }),
    EditorView.updateListener.of(({ view, transactions }) => {
      const id = view.state.facet(documentId);
      if (!id || transactions.some((tr) => tr.isUserEvent(stateRestoreAnnotation))) {
        return;
      }

      const { scrollTop } = view.scrollDOM;
      const pos = view.posAtCoords({ x: 0, y: scrollTop });
      if (pos !== null) {
        const { anchor, head } = view.state.selection.main;
        setStateDebounced(id, { scrollTo: pos, selection: { anchor, head } });
      }
    }),
    keymap.of([
      {
        key: 'ctrl-r', // TODO(burdon): Setting to jump back to selection.
        run: (view) => {
          const selection = state[view.state.facet(documentId)];
          if (selection) {
            view.dispatch(createEditorStateTransaction(selection));
          }
          return true;
        },
      },
    ]),
  ];
};
