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
export const folding = (): Extension => [
  codeFolding({
    placeholderDOM: () => Domino.of('span').root,
  }),
  foldGutter({
    markerDOM: (open) => {
      return Domino.of('div')
        .classNames('flex bs-full justify-center items-center')
        .children(
          Domino.of('svg', Domino.SVG)
            .classNames(mx('is-4 bs-4 cursor-pointer', open && 'rotate-90'))
            .children(
              Domino.of('use', Domino.SVG).attributes({
                href: Domino.icon('ph--caret-right--regular'),
              }),
            ),
        ).root;
    },
    // TODO(burdon): markerDOM is called either way, defeating the animation: transition-transform duration-200
    // domEventHandlers: {
    //   click: (view, line: BlockInfo, event) => {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     const range = foldable(view.state, line.from, line.to);
    //     if (range) {
    //       view.dispatch({ effects: foldEffect.of(range) });
    //       (event.target as HTMLElement)?.classList.add('rotate-90');
    //     } else {
    //       foldedRanges(view.state).between(line.from, line.to, (from, to) => {
    //         view.dispatch({ effects: unfoldEffect.of({ from, to }) });
    //         (event.target as HTMLElement)?.classList.remove('rotate-90');
    //       });
    //     }
    //     return true;
    //   },
    // },
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
