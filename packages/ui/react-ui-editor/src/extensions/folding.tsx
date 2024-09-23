//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { renderRoot } from './util';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Remember folding state.
export const folding = (_props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => {
      return document.createElement('span'); // Just collapse.
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      const el = renderRoot(
        document.createElement('div'),
        <Icon icon='ph--caret-right--regular' classNames={[getSize(3), 'mx-3 cursor-pointer', open && 'rotate-90']} />,
      );
      el.className = 'flex h-full items-center';
      return el;
    },
  }),
  EditorView.theme({
    '.cm-foldGutter': {
      opacity: 0.3,
    },
    '.cm-foldGutter:hover': {
      opacity: 1,
    },
  }),
];
