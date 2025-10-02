//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { Icon } from '@dxos/react-ui';

import { Domino, renderRoot } from '../util';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Remember folding state (to state).
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return document.createElement('span'); // Collapse content.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      // TODO(burdon): Use sprite directly.
      const el = Domino.of('div').classNames('flex h-full items-center').build();
      return renderRoot(
        el,
        <Icon icon='ph--caret-right--bold' size={3} classNames={['mx-3 cursor-pointer', open && 'rotate-90']} />,
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
];
