//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import React from 'react';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx, getSize, mx } from '@dxos/react-ui-theme';

import { renderRoot } from './util';

export type FoldingOptions = {};

/**
 * https://codemirror.net/examples/gutter
 */
export const folding = (props: FoldingOptions = {}): Extension => [
  codeFolding({
    placeholderDOM: () => document.createElement('div'),
  }),
  foldGutter({
    markerDOM: (open) => {
      return renderRoot(
        <ThemeProvider tx={defaultTx}>
          <svg className={mx(getSize(3), 'm-3 cursor-pointer', open && 'rotate-90')}>
            <use href={'/icons.svg#ph--caret-right--regular'} />
          </svg>
        </ThemeProvider>,
      );
    },
  }),
];
