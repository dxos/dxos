//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import $ from 'cash-dom';

import { mx } from '@dxos/ui-theme';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return document.createElement('span'); // Collapse content.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      return $('<div>')
        .addClass('flex bs-full justify-center items-center')
        .append(
          $(document.createElementNS(SVG_NS, 'svg'))
            .addClass(mx('is-4 bs-4', open && 'rotate-90'))
            .append($(document.createElementNS(SVG_NS, 'use')).attr('href', '/icons.svg#ph--caret-right--regular')),
        )
        .get()[0];
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
];
