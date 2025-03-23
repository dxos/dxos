//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter, foldedRanges, foldEffect } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { debounce } from '@dxos/async';
import { Icon } from '@dxos/react-ui';

import { documentId } from './selection';
import { createElement, renderRoot } from '../util';

export type FoldRange = {
  from: number;
  to: number;
};

export type FoldState = {
  foldedRanges: FoldRange[];
};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (state: Record<string, FoldState> = {}): Extension => {
  const setState = (id: string, foldState: FoldState) => {
    state[id] = foldState;
  };
  const setStateDebounced = debounce(setState, 1_000);
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
    EditorView.updateListener.of(({ view }) => {
      const id = view.state.facet(documentId);
      if (!id) {
        return;
      }

      // Handle initial state restoration only once
      if (!initialized) {
        initialized = true;
        const foldState = state[id];
        if (foldState?.foldedRanges?.length) {
          view.dispatch({
            effects: foldState.foldedRanges.map((range) => foldEffect.of({ from: range.from, to: range.to })),
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
  ];
};
