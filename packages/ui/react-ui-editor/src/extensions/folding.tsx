//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter, foldedRanges, foldEffect } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { Icon } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { documentId } from './selection';
import { createElement, renderRoot } from '../util';

export type FoldRange = {
  from: number;
  to: number;
};

export type FoldState = {
  foldedRanges: FoldRange[];
};

export type FoldStateStore = {
  setState: (id: string, state: FoldState) => void;
  getState: (id: string) => FoldState | undefined;
};

export const createFoldStateStore = (keyPrefix: string): FoldStateStore => ({
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

export type FoldingOptions = {
  store?: FoldStateStore;
};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (props: FoldingOptions = {}): Extension => {
  const { store } = props;
  const setStateDebounced = store?.setState && debounce(store.setState, 1_000);
  let initialized = false;

  return [
    codeFolding({
      placeholderDOM: () => {
        return document.createElement('span'); // Collapse content.
      },
    }),
    foldGutter({
      markerDOM: (open) => {
        // TODO(burdon): Use sprite directly.
        const el = createElement('div', { className: 'flex h-full items-center' });
        return renderRoot(
          el,
          <Icon icon='ph--caret-right--regular' size={3} classNames={['mx-3 cursor-pointer', open && 'rotate-90']} />,
        );
      },
    }),
    EditorView.theme({
      '.cm-foldGutter': {
        opacity: 0.3,
        transition: 'opacity 0.3s',
        width: '32px',
      },
      '.cm-foldGutter:hover': {
        opacity: 1,
      },
    }),
    store &&
      EditorView.updateListener.of(({ view }) => {
        const id = view.state.facet(documentId);
        if (!id) {
          return;
        }

        // Handle initial state restoration only once
        if (!initialized) {
          initialized = true;
          const state = store.getState?.(id);
          if (state?.foldedRanges?.length) {
            view.dispatch({
              effects: state.foldedRanges.map((range) => foldEffect.of({ from: range.from, to: range.to })),
            });
          }
          return;
        }

        // Track fold changes for saving state
        const decorations = foldedRanges(view.state);
        const ranges: FoldRange[] = [];
        decorations.between(0, view.state.doc.length, (from: number, to: number) => {
          ranges.push({ from, to });
        });
        const foldState: FoldState = { foldedRanges: ranges };
        setStateDebounced?.(id, foldState);
      }),
  ].filter(isNotFalsy);
};
