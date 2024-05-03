//
// Copyright 2024 DXOS.org
//

import { type Extension, Transaction } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { isNotFalsy } from '@dxos/util';

import { documentId } from './doc';

const scrollAnnotation = 'dxos.org/cm/scrolling';

// NOTE: Serializable.
export type SelectionState = {
  scrollTo: {
    from: number;
  };
  selection: {
    anchor: number;
    head?: number;
  };
};

export type StateOptions = {
  setState: (id: string, state: SelectionState) => void;
  getState: (id: string) => SelectionState | undefined;
};

const keyPrefix = 'dxos.org/react-ui-editor/state';
export const localStorageStateStoreAdapter: StateOptions = {
  setState: (id, state) => {
    invariant(id);
    localStorage.setItem(`${keyPrefix}/${id}`, JSON.stringify(state));
  },
  getState: (id) => {
    invariant(id);
    const state = localStorage.getItem(`${keyPrefix}/${id}`);
    return state ? JSON.parse(state) : undefined;
  },
};

/**
 * Track scrolling and selection state to be restored when switching to document.
 */
export const state = ({ getState, setState }: Partial<StateOptions> = {}): Extension => {
  const setStateDebounced = debounce(setState!, 1_000);

  return [
    // TODO(burdon): Track scrolling (currently only updates when cursor moves).
    EditorView.updateListener.of(({ view, changes, transactions }) => {
      // TODO(burdon): Don't react to initial scroll.
      const id = view.state.facet(documentId);
      if (!id || transactions.some((tr) => tr.isUserEvent(scrollAnnotation))) {
        return;
      }

      if (setState) {
        const { top } = view.dom.getBoundingClientRect();
        const pos = view.posAtCoords({ x: 0, y: top });
        if (pos !== null) {
          const { anchor, head } = view.state.selection.main;
          setStateDebounced(id, {
            scrollTo: { from: pos, yMargin: 0 },
            selection: { anchor, head },
          });
        }
      }
    }),
    getState &&
      keymap.of([
        {
          key: 'ctrl-r', // TODO(burdon): Setting to jump back to bookmark.
          run: (view) => {
            const state = getState(view.state.facet(documentId));
            if (state) {
              view.dispatch({
                effects: EditorView.scrollIntoView(state.scrollTo.from, { yMargin: 0 }),
                selection: state.selection,
                annotations: Transaction.userEvent.of(scrollAnnotation),
              });
            }
            return true;
          },
        },
      ]),
  ].filter(isNotFalsy);
};
