//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { Domino } from '@dxos/ui';

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
      return Domino.of('div')
        .classNames('flex bs-full items-center')
        .children(Domino.of('svg').children(Domino.of('use').attr('href', '/icons.svg#ph--arrow-right--regular')))
        .build();
      // TODO(burdon): Use sprint directly.
      // <svg><use href="/icons.svg#ph--arrow-right--regular"/></svg>
      // <Icon icon='ph--caret-right--bold' size={3} classNames={['mx-3 cursor-pointer', open && 'rotate-90']} />,
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
