//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { GutterMarker } from '@codemirror/view';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx, getSize, mx } from '@dxos/react-ui-theme';

class LineGutterMarker extends GutterMarker {
  override toDOM() {
    const el = document.createElement('div');
    el.className = 'flex items-center text-primary-500';
    el.appendChild(document.createTextNode('→'));
    const svg = el.appendChild(document.createElement('svg'));
    svg.className = mx(getSize(4), 'text-[--icons-color]');
    const use = svg.appendChild(document.createElement('use'));
    // TODO(burdon): Not working.
    use.setAttribute('href', '/icons.svg#ph--caret-right--regular');
    return el;
  }
}

const emptyMarker = new LineGutterMarker();

const emptyDiv = document.createElement('div');

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Experimental; side menu?
export const folding = ({}: FoldingOptions = {}): Extension => [
  // gutter({
  //   initialSpacer: () => emptyMarker,
  //   lineMarkerChange: (update) => {
  //     // TODO(burdon): Check if line changed.
  //     return update.selectionSet;
  //   },
  //   lineMarker: (view, line) => {
  //     const active = view.state.selection.ranges.some((range) => range.from >= line.from && range.to <= line.to);
  //     return active ? emptyMarker : null;
  //   },
  // }),
  codeFolding({
    placeholderDOM: () => {
      const el = document.createElement('div');
      // el.appendChild(document.createTextNode('[hidden]'));
      return el;
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      const el = document.createElement('div');
      createRoot(el).render(
        <ThemeProvider tx={defaultTx}>
          <svg className={mx(getSize(3), 'm-3 cursor-pointer', open && 'rotate-90')}>
            <use href={'/icons.svg#ph--caret-right--regular'} />
          </svg>
        </ThemeProvider>,
      );
      return el;
    },
  }),
];
