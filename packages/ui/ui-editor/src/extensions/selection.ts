//
// Copyright 2024 DXOS.org
//

import { type Extension, Transaction, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { isTruthy } from '@dxos/util';

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

export type EditorStateStore = {
  setState: (id: string, state: EditorSelectionState) => void;
  getState: (id: string) => EditorSelectionState | undefined;
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

export const createEditorStateStore = (keyPrefix: string): EditorStateStore => ({
  getState: (id) => {
    invariant(id);
    const state = localStorage.getItem(`${keyPrefix}/${id}`);
    return state ? JSON.parse(state) : undefined;
  },

  setState: (id, state) => {
    invariant(id);
    localStorage.setItem(`${keyPrefix}/${id}`, JSON.stringify(state));
  },
});

/**
 * Track scrolling and selection state to be restored when switching to document.
 */
export const selectionState = ({ getState, setState }: Partial<EditorStateStore> = {}): Extension => {
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

      if (setState) {
        const { scrollTop } = view.scrollDOM;
        const pos = view.posAtCoords({ x: 0, y: scrollTop });
        if (pos !== null) {
          const { anchor, head } = view.state.selection.main;
          setStateDebounced(id, { scrollTo: pos, selection: { anchor, head } });
        }
      }
    }),
    getState &&
      keymap.of([
        {
          key: 'Ctrl-r', // TODO(burdon): Setting to jump back to selection.
          run: (view) => {
            const state = getState(view.state.facet(documentId));
            if (state) {
              view.dispatch(createEditorStateTransaction(state));
            }
            return true;
          },
        },
      ]),
  ].filter(isTruthy);
};
