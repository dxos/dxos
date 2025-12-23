//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { Domino, mx } from '@dxos/ui';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return Domino.of('span').root; // Collapse content.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      const use = Domino.of('use').attributes({ href: Domino.icon('ph--caret-right--regular') });
      const svg = Domino.of('svg').classNames(mx('is-4 bs-4 cursor-pointer', open && 'rotate-90')).children(use);
      return Domino.of('div')
        .classNames('flex bs-full justify-center items-center')
        .children(svg)
        .root;
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
