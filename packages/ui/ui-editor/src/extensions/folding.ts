//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { Domino, mx } from '@dxos/ui';

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (): Extension => {
  return [
    codeFolding({
      placeholderDOM: () => Domino.of('span').root,
    }),
    foldGutter({
      // NOTE: We can't animate since the element is remounted on state change.
      markerDOM: (open) => {
        return Domino.of('div')
          .classNames('flex h-full justify-center items-center')
          .children(
            Domino.of('svg', Domino.SVG)
              .classNames(mx('w-4 h-4 cursor-pointer', open && 'rotate-90'))
              .children(
                Domino.of('use', Domino.SVG).attributes({
                  href: Domino.icon('ph--caret-right--regular'),
                }),
              ),
          ).root;
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
};
