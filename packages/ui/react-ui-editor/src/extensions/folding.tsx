//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { Domino, Icon } from '@dxos/react-ui';

import { renderRoot } from '../util';

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
      return renderRoot(
        Domino.of('div').classNames('flex h-full items-center').build(),
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
