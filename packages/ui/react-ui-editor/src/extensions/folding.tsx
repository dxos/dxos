//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { createElement, renderRoot } from './util';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Remember folding state.
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return document.createElement('span'); // Collapse content.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      return renderRoot(
        createElement('div', { className: 'flex h-full items-center' }),
        <Icon icon='ph--caret-right--regular' classNames={[getSize(3), 'mx-3 cursor-pointer', open && 'rotate-90']} />,
      );
    },
  }),
  EditorView.theme({
    '.cm-foldGutter': {
      opacity: 0.3,
      transition: 'opacity 0.3s',
    },
    '.cm-foldGutter:hover': {
      opacity: 1,
    },
  }),
];
