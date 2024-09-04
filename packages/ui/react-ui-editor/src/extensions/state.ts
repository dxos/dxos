//
// Copyright 2024 DXOS.org
//

import { type Extension, Transaction, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { isNotFalsy } from '@dxos/util';

import { documentId } from './doc';

const stateRestoreAnnotation = 'dxos.org/cm/state-restore';

export type EditorSelection = {
  anchor: number;
  head?: number;
};

export type EditorSelectionState = {
  scrollTo?: number;
  selection?: EditorSelection;
};

export type EditorStateOptions = {
  setState: (id: string, state: EditorSelectionState) => void;
  getState: (id: string) => EditorSelectionState | undefined;
};

const keyPrefix = 'dxos.org/react-ui-editor/state';
export const localStorageStateStoreAdapter: EditorStateOptions = {
  getState: (id) => {
    invariant(id);
    const state = localStorage.getItem(`${keyPrefix}/${id}`);
    return state ? JSON.parse(state) : undefined;
  },

  setState: (id, state) => {
    invariant(id);
    localStorage.setItem(`${keyPrefix}/${id}`, JSON.stringify(state));
  },
};

export const createEditorStateTransaction = ({ scrollTo, selection }: EditorSelectionState): TransactionSpec => {
  return {
    selection,
    scrollIntoView: !scrollTo,
    effects: scrollTo ? EditorView.scrollIntoView(scrollTo, { yMargin: 80 }) : undefined,
    annotations: Transaction.userEvent.of(stateRestoreAnnotation),
  };
};

/**
 * Track scrolling and selection state to be restored when switching to document.
 */
export const state = ({ getState, setState }: Partial<EditorStateOptions> = {}): Extension => {
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
          key: 'ctrl-r', // TODO(burdon): Setting to jump back to selection.
          run: (view) => {
            const state = getState(view.state.facet(documentId));
            if (state) {
              view.dispatch(createEditorStateTransaction(state));
            }
            return true;
          },
        },
      ]),
  ].filter(isNotFalsy);
};
