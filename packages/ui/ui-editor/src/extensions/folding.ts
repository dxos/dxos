//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { $, icon, mx } from '@dxos/ui';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return $('span').get()[0]; // Collapse content.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      return $('<div>')
        .addClass('flex bs-full justify-center items-center')
        .append(
          $.svg('svg')
            .addClass(mx('is-4 bs-4 cursor-pointer', open && 'rotate-90'))
            .append($.svg('use').attr('href', icon('ph--caret-right--regular'))),
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
